/**
 * Video Processing & AI Orchestration Controller
 * Coordinates video upload, AI microservice analysis, and PostgreSQL persistence.
 */

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const db = require('../db');
const aiClient = require('../services/aiClient');

// Upload directory path
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Upload Video Endpoint
 * Handles multipart file upload and registers record in 'videos' table.
 */
async function uploadVideo(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file provided.' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // Resolve athlete_id: if user is athlete, look up their own; if coach/admin, accept req.body.athlete_id
    let athleteId = req.body.athleteId || req.body.athlete_id;
    if (userRole === 'athlete' || !athleteId) {
      const athleteRes = await db.query('SELECT athlete_id FROM athletes WHERE user_id = $1', [userId]);
      if (athleteRes.rows.length === 0) {
        // If athlete row does not exist yet, auto-create one for this user
        athleteId = randomUUID();
        await db.query(
          'INSERT INTO athletes (athlete_id, user_id, sport) VALUES ($1, $2, $3)',
          [athleteId, userId, req.body.sport || 'General Athletics']
        );
      } else {
        athleteId = athleteRes.rows[0].athlete_id;
      }
    }

    const videoId = randomUUID();
    const activity = req.body.activity || 'Movement Assessment';
    const relativeUrl = `/uploads/${req.file.filename}`;

    // Insert into 'videos' table with 'uploaded' status
    const insertQuery = `
      INSERT INTO videos (
        video_id, athlete_id, activity, video_url, processing_status, uploaded_at
      ) VALUES ($1, $2, $3, $4, 'uploaded', CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await db.query(insertQuery, [videoId, athleteId, activity, relativeUrl]);

    return res.status(201).json({
      message: 'Video uploaded successfully.',
      video: result.rows[0],
      localPath: req.file.path,
    });
  } catch (err) {
    console.error('Error uploading video:', err);
    return res.status(500).json({ message: 'Failed to upload video.', error: err.message });
  }
}

/**
 * Trigger AI Analysis on a Video
 * Sends video path to Python AI service and stores results across 4 PostgreSQL tables.
 */
async function analyzeVideo(req, res) {
  const client = await db.pool.connect();
  try {
    const videoId = req.params.id;

    // 1. Fetch video record
    const videoRes = await client.query('SELECT * FROM videos WHERE video_id = $1', [videoId]);
    if (videoRes.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found.' });
    }
    const video = videoRes.rows[0];

    // Determine absolute path on server
    const filename = path.basename(video.video_url);
    const localVideoPath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(localVideoPath)) {
      return res.status(404).json({ message: `Video file not found at path: ${localVideoPath}` });
    }

    // 2. Fetch athlete profile & historical workload
    const athleteRes = await client.query(
      `SELECT a.*, u.name, u.email 
       FROM athletes a 
       JOIN users u ON a.user_id = u.user_id 
       WHERE a.athlete_id = $1`,
      [video.athlete_id]
    );
    const athleteData = athleteRes.rows[0] || {};

    const historyRes = await client.query(
      'SELECT COUNT(*) AS total_injuries FROM injury_history WHERE athlete_id = $1',
      [video.athlete_id]
    );
    const totalInjuries = parseInt(historyRes.rows[0]?.total_injuries || '0', 10);

    const athleteProfile = {
      age: athleteData.date_of_birth ? Math.max(18, new Date().getFullYear() - new Date(athleteData.date_of_birth).getFullYear()) : 25,
      height: parseFloat(athleteData.height_cm) || 180.0,
      weight: parseFloat(athleteData.weight_kg) || 75.0,
      previous_injuries: totalInjuries,
      injury_recurrence: totalInjuries > 1 ? 1 : 0,
      sport: athleteData.sport || 'Athletics',
    };

    const workloadData = {
      training_intensity: req.body.training_intensity ? parseFloat(req.body.training_intensity) : 0.55,
      recovery_time_days: req.body.recovery_time_days ? parseFloat(req.body.recovery_time_days) : 3.0,
      weekly_training_hours: req.body.weekly_training_hours ? parseFloat(req.body.weekly_training_hours) : 12.0,
      sleep_hours_avg: req.body.sleep_hours_avg ? parseFloat(req.body.sleep_hours_avg) : 7.5,
    };

    // Update status to 'processing'
    await client.query("UPDATE videos SET processing_status = 'processing' WHERE video_id = $1", [videoId]);

    // 3. Dispatch to Python AI Microservice
    const aiResult = await aiClient.analyzeVideoByPath(localVideoPath, athleteProfile, workloadData);

    // 4. Begin transactional commit to PostgreSQL
    await client.query('BEGIN');

    const meta = aiResult.video_metadata || {};
    const quality = aiResult.video_quality || {};
    const kine = aiResult.biomechanical_measurements || {};
    const ml = aiResult.ml_predictions || {};
    const risk = aiResult.weighted_risk_score || {};
    const recs = aiResult.recommendations || {};

    // Update 'videos' record
    await client.query(
      `UPDATE videos SET 
        duration = $1,
        fps = $2,
        resolution = $3,
        quality_score = $4,
        processing_status = 'completed'
       WHERE video_id = $5`,
      [
        meta.duration_sec || null,
        Math.round(meta.fps) || 30,
        meta.resolution || '1280x720',
        quality.blur_score || 85.0,
        videoId,
      ]
    );

    // Insert into 'analysis_results'
    const analysisId = randomUUID();
    const kneeValgus = kine.knee_valgus?.max ?? 8.0;
    const trunkLean = kine.trunk_lean?.max ?? 4.0;
    const symmetryScore = Math.max(0, 100 - (kine.bilateral_asymmetry?.mean ?? 8.0) * 2.5);
    const overallRiskScore = risk.overall_risk_score ?? 35.0;
    const riskLevel = risk.risk_category ?? 'MODERATE';

    await client.query(
      `INSERT INTO analysis_results (
        analysis_id, video_id, athlete_id, knee_valgus, hip_stability, trunk_lean,
        stride_length, joint_alignment, symmetry_score, fatigue_score, movement_quality,
        overall_risk_score, risk_level, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)`,
      [
        analysisId,
        videoId,
        video.athlete_id,
        kneeValgus,
        80.0, // hip_stability proxy
        trunkLean,
        1.2,  // stride_length proxy
        85.0, // joint_alignment
        symmetryScore,
        risk.factor_breakdown?.fatigue_recovery?.score ?? 25.0,
        Math.max(10, 100 - overallRiskScore), // movement_quality
        overallRiskScore,
        riskLevel,
      ]
    );

    // Insert into 'injury_predictions'
    const predictionId = randomUUID();
    const catProbs = ml.injury_category_probabilities || {};
    const aclRisk = Math.round((catProbs['Knee / ACL Tear'] || 0.20) * 100);
    const hamstringRisk = Math.round((catProbs['Hamstring / Muscle Strain'] || 0.15) * 100);
    const ankleRisk = Math.round((catProbs['Ankle Sprain'] || 0.25) * 100);
    const shoulderRisk = Math.round((catProbs['Upper Body / Shoulder'] || 0.15) * 100);
    const lowerBackRisk = Math.round((catProbs['Spinal / Back Pain'] || 0.10) * 100);
    const overuseRisk = Math.round((ml.workload_injury_probability || 0.35) * 100);

    await client.query(
      `INSERT INTO injury_predictions (
        prediction_id, analysis_id, acl_risk, hamstring_risk, ankle_risk,
        shoulder_risk, lower_back_risk, overuse_risk
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        predictionId,
        analysisId,
        aclRisk,
        hamstringRisk,
        ankleRisk,
        shoulderRisk,
        lowerBackRisk,
        overuseRisk,
      ]
    );

    // Insert into 'recommendations'
    const recommendationId = randomUUID();
    const exercisesJson = JSON.stringify(recs.corrective_exercises || []);
    const mobilityJson = JSON.stringify(recs.mobility_drills || []);
    const strengthJson = JSON.stringify(recs.strengthening_protocols || []);
    const recoveryJson = JSON.stringify(recs.workload_adjustments || []);
    const modText = recs.priority_focus || 'Target biomechanical asymmetries and joint alignment.';

    await client.query(
      `INSERT INTO recommendations (
        recommendation_id, prediction_id, exercise, mobility, strengthening, recovery, training_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        recommendationId,
        predictionId,
        exercisesJson,
        mobilityJson,
        strengthJson,
        recoveryJson,
        modText,
      ]
    );

    await client.query('COMMIT');

    // Return the combined analysis
    return res.json({
      success: true,
      analysisId,
      predictionId,
      videoId,
      athleteId: video.athlete_id,
      videoMetadata: meta,
      videoQuality: quality,
      
      // 1. Biomechanical Measurements
      biomechanicalMeasurements: kine,

      // 2. ML Predictions
      mlPredictions: ml,

      // 3. Weighted Risk Score
      weightedRiskScore: risk,

      anomalies: aiResult.anomalies || [],
      recommendations: recs,
      annotatedVideoUrl: aiResult.annotated_video_url ? `http://localhost:8000${aiResult.annotated_video_url}` : null,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error analyzing video:', err);

    // Reset processing status on failure
    if (req.params.id) {
      await db.query("UPDATE videos SET processing_status = 'failed' WHERE video_id = $1", [req.params.id]).catch(() => {});
    }

    return res.status(500).json({
      message: 'Video analysis failed.',
      error: err.message,
    });
  } finally {
    client.release();
  }
}

/**
 * Get Analysis by Video ID
 */
async function getAnalysisByVideoId(req, res) {
  try {
    const videoId = req.params.id;

    const query = `
      SELECT 
        v.video_id, v.video_url, v.duration, v.fps, v.resolution, v.quality_score, v.processing_status,
        ar.analysis_id, ar.knee_valgus, ar.hip_stability, ar.trunk_lean, ar.symmetry_score,
        ar.fatigue_score, ar.movement_quality, ar.overall_risk_score, ar.risk_level, ar.created_at,
        ip.prediction_id, ip.acl_risk, ip.hamstring_risk, ip.ankle_risk, ip.shoulder_risk,
        ip.lower_back_risk, ip.overuse_risk,
        r.recommendation_id, r.exercise, r.mobility, r.strengthening, r.recovery, r.training_modification
      FROM videos v
      LEFT JOIN analysis_results ar ON v.video_id = ar.video_id
      LEFT JOIN injury_predictions ip ON ar.analysis_id = ip.analysis_id
      LEFT JOIN recommendations r ON ip.prediction_id = r.prediction_id
      WHERE v.video_id = $1
      ORDER BY ar.created_at DESC
      LIMIT 1
    `;

    const result = await db.query(query, [videoId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No analysis found for this video.' });
    }

    const row = result.rows[0];

    // Safely parse JSON strings for recommendations
    let exercises = [];
    let mobility = [];
    let strength = [];
    let recovery = [];
    try { exercises = JSON.parse(row.exercise || '[]'); } catch { exercises = [row.exercise]; }
    try { mobility = JSON.parse(row.mobility || '[]'); } catch { mobility = [row.mobility]; }
    try { strength = JSON.parse(row.strengthening || '[]'); } catch { strength = [row.strengthening]; }
    try { recovery = JSON.parse(row.recovery || '[]'); } catch { recovery = [row.recovery]; }

    return res.json({
      videoId: row.video_id,
      videoUrl: row.video_url,
      status: row.processing_status,
      analysis: row.analysis_id ? {
        analysisId: row.analysis_id,
        kneeValgus: row.knee_valgus,
        trunkLean: row.trunk_lean,
        symmetryScore: row.symmetry_score,
        overallRiskScore: row.overall_risk_score,
        riskLevel: row.risk_level,
        movementQuality: row.movement_quality,
        createdAt: row.created_at,
        predictions: {
          aclRisk: row.acl_risk,
          hamstringRisk: row.hamstring_risk,
          ankleRisk: row.ankle_risk,
          shoulderRisk: row.shoulder_risk,
          lowerBackRisk: row.lower_back_risk,
          overuseRisk: row.overuse_risk,
        },
        recommendations: {
          priorityFocus: row.training_modification,
          correctiveExercises: exercises,
          mobilityDrills: mobility,
          strengtheningProtocols: strength,
          workloadAdjustments: recovery,
        },
      } : null,
    });
  } catch (err) {
    console.error('Error fetching analysis:', err);
    return res.status(500).json({ message: 'Failed to retrieve analysis.', error: err.message });
  }
}

/**
 * Get Athlete's Analysis History
 */
async function getAthleteAnalyses(req, res) {
  try {
    const athleteId = req.params.athleteId;

    const query = `
      SELECT 
        ar.analysis_id, ar.overall_risk_score, ar.risk_level, ar.knee_valgus,
        ar.trunk_lean, ar.symmetry_score, ar.movement_quality, ar.created_at,
        v.video_id, v.activity, v.video_url,
        ip.acl_risk, ip.hamstring_risk, ip.ankle_risk
      FROM analysis_results ar
      JOIN videos v ON ar.video_id = v.video_id
      LEFT JOIN injury_predictions ip ON ar.analysis_id = ip.analysis_id
      WHERE ar.athlete_id = $1
      ORDER BY ar.created_at DESC
    `;

    const result = await db.query(query, [athleteId]);
    return res.json({
      athleteId,
      totalAnalyses: result.rows.length,
      history: result.rows,
    });
  } catch (err) {
    console.error('Error fetching athlete history:', err);
    return res.status(500).json({ message: 'Failed to fetch history.', error: err.message });
  }
}

module.exports = {
  uploadVideo,
  analyzeVideo,
  getAnalysisByVideoId,
  getAthleteAnalyses,
  UPLOADS_DIR,
};
