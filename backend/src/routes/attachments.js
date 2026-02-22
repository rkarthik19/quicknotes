const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

const UPLOADS_DIR = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// POST /api/attachments/:noteId
router.post('/:noteId', upload.single('file'), (req, res) => {
  const note = db.prepare('SELECT id FROM notes WHERE id = ?').get(req.params.noteId);
  if (!note) {
    fs.unlinkSync(req.file.path);
    return res.status(404).json({ error: 'Note not found' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO attachments (id, note_id, filename, original_name, mime_type, size)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.params.noteId, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size);

  res.status(201).json(db.prepare('SELECT * FROM attachments WHERE id = ?').get(id));
});

// GET /api/attachments/:id/download
router.get('/:id/download', (req, res) => {
  const attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id);
  if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

  const filePath = path.join(UPLOADS_DIR, attachment.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

  res.setHeader('Content-Disposition', `inline; filename="${attachment.original_name}"`);
  res.setHeader('Content-Type', attachment.mime_type);
  res.sendFile(filePath);
});

// DELETE /api/attachments/:id
router.delete('/:id', (req, res) => {
  const attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id);
  if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

  const filePath = path.join(UPLOADS_DIR, attachment.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM attachments WHERE id = ?').run(req.params.id);
  res.json({ message: 'Attachment deleted' });
});

module.exports = router;
