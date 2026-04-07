const express = require('express');
const mongoose = require('mongoose');


const cors = require('cors'); // DB Reconnect Trigger
const path = require('path');
require('dotenv').config();

const app = express();

// ─── Middleware ───────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Serve Static Files (Frontend) ──────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── MongoDB Connection ─────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/campusiq';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log(`📦 Database: ${mongoose.connection.name}`);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('⚠️  Running without Database. API features will fail, but static UI will load.');
  });

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

// ─── API Routes ─────────────────────────────────────────
const routes = require('./routes');
app.use('/api', routes);

// ─── Health Check ───────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'CampusIQ AI',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ─── Serve Frontend Pages ───────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

app.get('/explore', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'explore.html'));
});

// ─── 404 Handler ────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ───────────────────────────────
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ─── Start Server ───────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║     🎓 CampusIQ AI Server Running       ║
  ║                                          ║
  ║     🌐 http://localhost:${PORT}             ║
  ║     📊 Environment: ${process.env.NODE_ENV || 'development'}       ║
  ╚══════════════════════════════════════════╝
  `);
});

module.exports = app;
