
const express = require('express');
const mysql = require('mysql2/promise');
const rateLimit = require('express-rate-limit');
const app = express();
app.use(express.json());

// MySQL connection
const pool = mysql.createPool({
  host: 'localhost',
  user: 'blog_user',
  password: 'SuperSecretKey@123',
  database: 'blog_db',
  port: 3306,
});

// Test the connection
pool.getConnection()
  .then(conn => {
    console.log('MySQL connection successful');
    conn.release();
   })
   .catch(err => {
     console.error('MySQL connection error', err);
   });

// Rate limiting (100 requests per 2 minutes)
const limiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 100, // 100 requests
});
app.use(limiter);

// API Key middleware for basic security
const API_KEY = 'secretkey123';
app.use((req, res, next) => {
  const auth = req.headers['authorization'];
  console.log('Received Authorizaton Header:', auth);
  console.log('Expected Authorization Header:', 'Bearer ${API_KEY}');
  if (!auth || auth !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Create blog post
app.post('/posts', async (req, res) => {
  const { title, content, author } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO posts (title, content, author) VALUES (?, ?, ?)',
      [title, content, author]
    );
    res.status(201).json({ id: result.insertId, title, content, author });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all blog posts
app.get('/posts', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM posts');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific blog post
app.get('/posts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update blog post
app.put('/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, author } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE posts SET title = ?, content = ?, author = ? WHERE id = ?',
      [title, content, author, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json({ id, title, content, author });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete blog post
app.delete('/posts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM posts WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
