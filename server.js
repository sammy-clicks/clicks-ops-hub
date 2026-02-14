const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // For Render
});

// Middleware
app.use(express.json({ limit: '50mb' })); // For large base64 files
app.use(express.static(path.join(__dirname)));

// Create tables if not exist
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS venues (
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('DB initialized');
  } catch (err) {
    console.error('DB init error:', err);
  }
}

// API endpoints
app.get('/api/venues', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM venues ORDER BY created_at DESC');
    res.json(result.rows.map(r => r.data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

app.post('/api/venues', async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'No data provided' });
    await pool.query('INSERT INTO venues (data) VALUES ($1)', [JSON.stringify(data)]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save venue' });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM posts ORDER BY created_at DESC');
    res.json(result.rows.map(r => r.data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'No data provided' });
    await pool.query('INSERT INTO posts (data) VALUES ($1)', [JSON.stringify(data)]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save post' });
  }
});

app.post('/api/delete', async (req, res) => {
  try {
    const { type, name } = req.body;
    if (type === 'venue') {
      await pool.query("DELETE FROM venues WHERE data->>'business_name' = $1 OR data->>'local' = $1 OR data->>'local_name' = $1", [name]);
    } else if (type === 'post') {
      await pool.query("DELETE FROM posts WHERE data->>'business_name' = $1 OR data->>'local' = $1 OR data->>'local_name' = $1", [name]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// Start server
initDB().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});