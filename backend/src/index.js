require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const notesRouter = require('./routes/notes');
const tagsRouter = require('./routes/tags');
const attachmentsRouter = require('./routes/attachments');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// API Routes
app.use('/api/notes', notesRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/attachments', attachmentsRouter);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ QuickNotes API running on http://localhost:${PORT}`);
});

module.exports = app;
