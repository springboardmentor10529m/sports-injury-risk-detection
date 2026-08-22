const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'sports_injury_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
