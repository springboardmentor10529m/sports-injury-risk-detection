/**
 * Video Upload & AI Analysis Integration Tests
 */

const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:5000';

async function runTests() {
  console.log('\n========================================');
  console.log('   RUNNING VIDEO & AI INTEGRATION TESTS');
  console.log('========================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Check AI Microservice Proxy Status
  console.log('1. Checking AI service status...');
  const statusRes = await fetch(`${BACKEND_URL}/api/ai/status`);
  assert(statusRes.status === 200, 'GET /api/ai/status returns 200 OK');
  const statusData = await statusRes.json();
  assert(statusData.aiMicroservice?.status === 'online', 'AI Microservice is reported online');
  assert(statusData.aiMicroservice?.models_loaded === true, 'AI Microservice has all ML models loaded');
  assert(Boolean(statusData.modelMetrics), 'Model evaluation metrics are available');

  // 2. Register & login test athlete
  console.log('2. Registering and authenticating test athlete...');
  const athleteEmail = `athlete-cv-${Date.now()}@example.com`;
  const athletePassword = 'Password@123';
  const regRes = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dynamic Motion Athlete',
      email: athleteEmail,
      password: athletePassword,
      confirmPassword: athletePassword,
      height: '185',
      weight: '80',
    }),
  });
  assert(regRes.status === 201, 'Athlete registration successful');

  const loginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: athleteEmail,
      password: athletePassword,
      role: 'athlete',
    }),
  });
  assert(loginRes.status === 200, 'Athlete login successful');
  const loginData = await loginRes.json();
  const token = loginData.token;
  const athleteId = loginData.user.athleteId;
  assert(Boolean(token), 'JWT token received');
  assert(Boolean(athleteId), 'Athlete ID identified');

  // 3. Upload a sports video
  console.log('3. Uploading sample movement video...');
  const sampleVideoPath = path.resolve(__dirname, '../../scratch/walk_test.mp4');
  assert(fs.existsSync(sampleVideoPath), 'Sample video file exists on disk');

  const fileBlob = new Blob([fs.readFileSync(sampleVideoPath)], { type: 'video/mp4' });
  const formData = new FormData();
  formData.append('video', fileBlob, 'walk_test.mp4');
  formData.append('activity', 'Dynamic Gait & Squat Assessment');
  formData.append('athleteId', athleteId);

  const uploadRes = await fetch(`${BACKEND_URL}/api/videos/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  assert(uploadRes.status === 201, 'POST /api/videos/upload returns 201 Created');
  const uploadData = await uploadRes.json();
  const videoId = uploadData.video.video_id;
  assert(Boolean(videoId), 'Video record ID generated and stored');
  assert(uploadData.video.processing_status === 'uploaded', 'Video initial status is "uploaded"');

  // 4. Trigger AI Analysis
  console.log('4. Triggering AI analysis on uploaded video...');
  const analyzeRes = await fetch(`${BACKEND_URL}/api/videos/${videoId}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      training_intensity: 0.65,
      recovery_time_days: 2.5,
      weekly_training_hours: 14.0,
      sleep_hours_avg: 7.5,
    }),
  });

  assert(analyzeRes.status === 200, 'POST /api/videos/:id/analyze returns 200 OK');
  const analysisData = await analyzeRes.json();
  assert(analysisData.success === true, 'AI analysis pipeline reported success');
  
  // Verify 3 distinct layers of data
  assert(Boolean(analysisData.biomechanicalMeasurements?.knee_flexion), '1. Biomechanical measurements (knee flexion) present');
  assert(Boolean(analysisData.biomechanicalMeasurements?.bilateral_asymmetry), '1. Biomechanical measurements (asymmetry) present');
  assert(Boolean(analysisData.mlPredictions?.severity_probabilities), '2. ML predictions (severity probabilities) present');
  assert(Boolean(analysisData.mlPredictions?.primary_injury_risk_category), '2. ML predictions (injury category) present');
  assert(typeof analysisData.weightedRiskScore?.overall_risk_score === 'number', '3. Weighted risk score (0-100) computed');
  assert(Boolean(analysisData.weightedRiskScore?.risk_category), '3. Risk category classified');
  assert(Boolean(analysisData.recommendations?.corrective_exercises), 'Corrective recommendations generated');

  // 5. Verify GET /api/videos/:id/analysis
  console.log('5. Retrieving persisted analysis from PostgreSQL...');
  const getRes = await fetch(`${BACKEND_URL}/api/videos/${videoId}/analysis`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(getRes.status === 200, 'GET /api/videos/:id/analysis returns 200 OK');
  const persistedData = await getRes.json();
  assert(persistedData.videoId === videoId, 'Persisted video ID matches');
  assert(persistedData.analysis?.overallRiskScore === analysisData.weightedRiskScore.overall_risk_score, 'Persisted risk score matches');
  assert(Boolean(persistedData.analysis?.predictions?.aclRisk !== undefined), 'Persisted predictions intact');
  assert(persistedData.analysis?.recommendations?.correctiveExercises?.length > 0, 'Persisted recommendations parsed');

  // 6. Verify Athlete Analysis History
  console.log('6. Fetching athlete analysis history...');
  const histRes = await fetch(`${BACKEND_URL}/api/videos/athlete/${athleteId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(histRes.status === 200, 'GET /api/videos/athlete/:id returns 200 OK');
  const histData = await histRes.json();
  assert(histData.totalAnalyses >= 1, 'Athlete history includes at least 1 analysis record');

  console.log('\n========================================');
  console.log(`   VIDEO & AI TESTS: ${passed}/${total} PASSED`);
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
