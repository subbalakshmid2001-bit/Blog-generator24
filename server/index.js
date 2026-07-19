const express = require('express');
const cors = require('cors');
require('dotenv').config();

const blogRoutes = require('./routes/blog.routes');
const keywordsRoutes = require('./routes/keywords.routes');
const newsRoutes = require('./routes/news.routes');
const imageRoutes = require('./routes/image.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/blog', blogRoutes);
app.use('/api/keywords', keywordsRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/image', imageRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    status: err.status || 500
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Blog Generator Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available:`);
  console.log(`   - POST /api/blog/generate - Generate blog post`);
  console.log(`   - GET /api/keywords - Get keyword lists`);
  console.log(`   - GET /api/news/:niche - Get news for niche`);
  console.log(`   - POST /api/image/generate - Generate images`);
});

module.exports = app;
