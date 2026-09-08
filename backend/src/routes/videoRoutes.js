/**
 * Video Upload & AI Analysis Routes
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { verifyToken } = require('../middleware/authMiddleware');
const videoController = require('../controllers/videoController');

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videoController.UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `video-${uniqueSuffix}${ext}`);
  },
});

// File filter for sports video formats
const fileFilter = (req, file, cb) => {
  const allowedExts = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext) || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported video format. Allowed formats: ${allowedExts.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max
  },
});

// Routes
// 1. Upload video file (Authenticated)
router.post('/upload', verifyToken, upload.single('video'), videoController.uploadVideo);

// 2. Trigger AI analysis for uploaded video
router.post('/:id/analyze', verifyToken, videoController.analyzeVideo);

// 3. Get analysis details for a video
router.get('/:id/analysis', verifyToken, videoController.getAnalysisByVideoId);

// 4. Get athlete historical analysis records
router.get('/athlete/:athleteId', verifyToken, videoController.getAthleteAnalyses);

module.exports = router;
