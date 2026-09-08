const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Flexible CORS setup for local development origins (localhost & 127.0.0.1)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json());

const path = require('path');
const videoRoutes = require('./routes/videoRoutes');
const aiClient = require('./services/aiClient');

// Serve uploaded video assets statically
const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authRoutes); // supports /api/users/profile
app.use('/api/admin', authRoutes); // supports /api/admin/athletes/...
app.use('/api/videos', videoRoutes);
app.use('/api', authRoutes);

// Health check & root endpoints
const healthHandler = (req, res) => {
  res.json({ status: 'ok', service: 'sports-injury-backend', timestamp: new Date() });
};

app.get('/', healthHandler);
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// AI Microservice status endpoint
app.get('/api/ai/status', async (req, res) => {
  const aiHealth = await aiClient.checkHealth();
  const metrics = await aiClient.getModelMetrics();
  res.json({
    aiMicroservice: aiHealth,
    modelMetrics: metrics,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Sports Injury Backend Server running on http://localhost:${PORT}`);
});
