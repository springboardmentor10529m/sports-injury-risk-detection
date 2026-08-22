const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS setup allowing frontend origin
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authRoutes); // supports /api/users/profile

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'sports-injury-auth-backend', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Authentication Backend Server running on http://localhost:${PORT}`);
});
