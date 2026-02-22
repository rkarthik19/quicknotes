const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

// Helper: get full note with tags and attachments
function getNoteById(id) {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  if (!note) return null;
  note.completed = Boolean(note.completed);
  note.tags = db.prepare(`
    SELECT t.* FROM tags t
    JOIN note_tags nt ON nt.tag_id = t.id
    WHERE nt.note_id = ?
  `).all(id);
  note.attachments = db.prepare('SELECT * FROM attachments WHERE note_id = ?').all(id);
  return note;
}

// GET /api/notes — list with optional search, tag filter, priority filter
router.get('/', (req, res) => {
  const { search, tag, priority, completed } = req.query;
  let query = `SELECT DISTINCT n.* FROM notes n`;
  const params = [];
  const conditions = [];

  if (tag) {
    query += ` JOIN note_tags nt ON nt.note_id = n.id JOIN tags t ON t.id = nt.tag_id`;
    conditions.push(`t.name = ?`);
    params.push(tag);
  }

  if (search) {
    conditions.push(`(n.title LIKE ? OR n.body LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`);
  }

  if (priority) {
    conditions.push(`n.priority = ?`);
    params.push(priority);
  }

  if (completed !== undefined) {
    conditions.push(`n.completed = ?`);
    params.push(completed === 'true' ? 1 : 0);
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ');
  }

  query += ` ORDER BY 
    CASE n.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
    n.created_at DESC`;

  const notes = db.prepare(query).all(...params);
  const result = notes.map(note => {
    note.completed = Boolean(note.completed);
    note.tags = db.prepare(`
      SELECT t.* FROM tags t
      JOIN note_tags nt ON nt.tag_id = t.id
      WHERE nt.note_id = ?
    `).all(note.id);
    note.attachments = db.prepare('SELECT * FROM attachments WHERE note_id = ?').all(note.id);
    return note;
  });

  res.json(result);
});

// GET /api/notes/:id
router.get('/:id', (req, res) => {
  const note = getNoteById(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  res.json(note);
});

// POST /api/notes
router.post('/', (req, res) => {
  const { title, body = '', priority = 'medium', reminder_at, tag_ids = [] } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO notes (id, title, body, priority, reminder_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, body, priority, reminder_at || null, now, now);

  // Assign tags
  const insertTag = db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)');
  for (const tagId of tag_ids) {
    insertTag.run(id, tagId);
  }

  res.status(201).json(getNoteById(id));
});

// PUT /api/notes/:id
router.put('/:id', (req, res) => {
  const { title, body, priority, completed, reminder_at, tag_ids } = req.body;
  const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Note not found' });

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE notes SET
      title = COALESCE(?, title),
      body = COALESCE(?, body),
      priority = COALESCE(?, priority),
      completed = COALESCE(?, completed),
      reminder_at = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    title || null,
    body !== undefined ? body : null,
    priority || null,
    completed !== undefined ? (completed ? 1 : 0) : null,
    reminder_at !== undefined ? (reminder_at || null) : existing.reminder_at,
    now,
    req.params.id
  );

  // Update tags if provided
  if (tag_ids !== undefined) {
    db.prepare('DELETE FROM note_tags WHERE note_id = ?').run(req.params.id);
    const insertTag = db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)');
    for (const tagId of tag_ids) {
      insertTag.run(req.params.id, tagId);
    }
  }

  res.json(getNoteById(req.params.id));
});

// PATCH /api/notes/:id/complete — toggle completion
router.patch('/:id/complete', (req, res) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  db.prepare('UPDATE notes SET completed = ?, updated_at = ? WHERE id = ?')
    .run(note.completed ? 0 : 1, new Date().toISOString(), req.params.id);
  res.json(getNoteById(req.params.id));
});

// DELETE /api/notes/:id
router.delete('/:id', (req, res) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  res.json({ message: 'Note deleted' });
});

module.exports = router;
