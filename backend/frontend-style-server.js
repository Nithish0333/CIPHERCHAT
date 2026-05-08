const express = require('express');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, '../frontend/build')));

// API routes will be handled by frontend components directly
// No more REST API endpoints needed

// Handle all routes with a catch-all for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Frontend-style server running on port ${PORT}`);
  console.log(`📁 Serving static files from frontend/build`);
  console.log(`🌐 Open http://localhost:${PORT} in your browser`);
});
