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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authRoutes); // supports /api/users/profile
app.use('/api/admin', authRoutes); // supports /api/admin/athletes/...
app.use('/api', authRoutes);

// Health check & root endpoints
const healthHandler = (req, res) => {
  res.json({ status: 'ok', service: 'sports-injury-auth-backend', timestamp: new Date() });
};

app.get('/', healthHandler);
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

app.listen(PORT, () => {
  console.log(`🚀 Authentication Backend Server running on http://localhost:${PORT}`);
});
