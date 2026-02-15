const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL connection
let pool;
try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // For Render
  });
  console.log('Pool created successfully');
} catch (err) {
  console.error('Failed to create pool:', err);
  process.exit(1);
}

// Middleware
app.use(express.json({ limit: '50mb' })); // For large base64 files
app.use(express.static(path.join(__dirname)));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create tables if not exist
async function initDB() {
  try {
    console.log('Initializing DB...');
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
    console.log('DB initialized successfully');
  } catch (err) {
    console.error('DB init error:', err);
  }
}

// API endpoints
app.get('/api/venues', async (req, res) => {
  try {
    console.log('Fetching venues...');
    const result = await pool.query('SELECT data FROM venues ORDER BY created_at DESC');
    console.log(`Fetched ${result.rows.length} venues`);
    res.json(result.rows.map(r => r.data));
  } catch (err) {
    console.error('Error fetching venues:', err);
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

app.post('/api/venues', async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'No data provided' });
    console.log('Saving venue:', data.local || data.business_name);
    await pool.query('INSERT INTO venues (data) VALUES ($1)', [JSON.stringify(data)]);
    console.log('Venue saved successfully');
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving venue:', err);
    res.status(500).json({ error: 'Failed to save venue' });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    console.log('Fetching posts...');
    const result = await pool.query('SELECT data FROM posts ORDER BY created_at DESC');
    console.log(`Fetched ${result.rows.length} posts`);
    res.json(result.rows.map(r => r.data));
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'No data provided' });
    console.log('Saving post:', data.local || data.business_name);
    await pool.query('INSERT INTO posts (data) VALUES ($1)', [JSON.stringify(data)]);
    console.log('Post saved successfully');
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving post:', err);
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
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  });
});