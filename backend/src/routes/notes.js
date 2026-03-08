const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

// Helper: record a history entry
const insertHistory = db.prepare(
  'INSERT INTO note_history (note_id, action, field, old_value, new_value, created_at) VALUES (?, ?, ?, ?, ?, ?)'
);

function recordHistory(noteId, action, field, oldVal, newVal) {
  insertHistory.run(noteId, action, field, oldVal ?? null, newVal ?? null, new Date().toISOString());
}

// Helper: get full note with tags and attachments
function getNoteById(id) {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  if (!note) return null;
  note.completed = Boolean(note.completed);
  note.canceled = Boolean(note.canceled);
  note.tags = db.prepare(`
    SELECT t.* FROM tags t
    JOIN note_tags nt ON nt.tag_id = t.id
    WHERE nt.note_id = ?
  `).all(id);
  note.attachments = db.prepare('SELECT * FROM attachments WHERE note_id = ?').all(id);
  return note;
}

// GET /api/notes/stats — counts for overdue, due today, due this week
router.get('/stats', (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString();

  const base = `FROM notes WHERE completed = 0 AND canceled = 0 AND reminder_at IS NOT NULL`;
  const overdue = db.prepare(`SELECT COUNT(*) as c ${base} AND reminder_at < ?`).get(now.toISOString()).c;
  const dueToday = db.prepare(`SELECT COUNT(*) as c ${base} AND reminder_at >= ? AND reminder_at < ?`).get(todayStart, todayEnd).c;
  const dueThisWeek = db.prepare(`SELECT COUNT(*) as c ${base} AND reminder_at >= ? AND reminder_at < ?`).get(todayStart, weekEnd).c;

  res.json({ overdue, dueToday, dueThisWeek });
});

// GET /api/notes — list with optional search, tag filter, priority filter, completed, canceled, due
router.get('/', (req, res) => {
  const { search, tag, priority, completed, canceled, due } = req.query;
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

  if (canceled === 'true') {
    // Explicitly requesting canceled notes
    conditions.push(`n.canceled = 1`);
  } else if (completed !== undefined) {
    conditions.push(`n.canceled = 0`);
    conditions.push(`n.completed = ?`);
    params.push(completed === 'true' ? 1 : 0);
  } else {
    // Default: exclude both canceled and completed
    conditions.push(`n.canceled = 0`);
  }

  // Due date filter
  if (due) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString();
    conditions.push(`n.reminder_at IS NOT NULL`);
    if (due === 'overdue') {
      conditions.push(`n.reminder_at < ?`);
      params.push(now.toISOString());
    } else if (due === 'today') {
      conditions.push(`n.reminder_at >= ? AND n.reminder_at < ?`);
      params.push(todayStart, todayEnd);
    } else if (due === 'week') {
      conditions.push(`n.reminder_at >= ? AND n.reminder_at < ?`);
      params.push(todayStart, weekEnd);
    }
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ');
  }

  query += ` ORDER BY
    CASE WHEN n.reminder_at IS NOT NULL THEN 0 ELSE 1 END,
    n.reminder_at ASC,
    CASE n.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
    n.created_at DESC`;

  const notes = db.prepare(query).all(...params);
  const result = notes.map(note => {
    note.completed = Boolean(note.completed);
    note.canceled = Boolean(note.canceled);
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

// GET /api/notes/:id/history
router.get('/:id/history', (req, res) => {
  const note = db.prepare('SELECT id FROM notes WHERE id = ?').get(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  const history = db.prepare('SELECT * FROM note_history WHERE note_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json(history);
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

  recordHistory(id, 'created', null, null, null);

  res.status(201).json(getNoteById(id));
});

// PUT /api/notes/:id
router.put('/:id', (req, res) => {
  const { title, body, priority, completed, canceled, reminder_at, tag_ids } = req.body;
  const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Note not found' });

  const now = new Date().toISOString();

  // canceled and completed are mutually exclusive
  let canceledVal = canceled !== undefined ? (canceled ? 1 : 0) : null;
  let completedVal = completed !== undefined ? (completed ? 1 : 0) : null;
  if (canceledVal === 1) completedVal = 0;
  if (completedVal === 1) canceledVal = 0;

  // Track field changes
  if (title && title !== existing.title) recordHistory(req.params.id, 'updated', 'title', existing.title, title);
  if (body !== undefined && body !== existing.body) recordHistory(req.params.id, 'updated', 'body', existing.body, body);
  if (priority && priority !== existing.priority) recordHistory(req.params.id, 'updated', 'priority', existing.priority, priority);
  const newReminder = reminder_at !== undefined ? (reminder_at || null) : existing.reminder_at;
  if (newReminder !== existing.reminder_at) recordHistory(req.params.id, 'updated', 'reminder', existing.reminder_at, newReminder);

  db.prepare(`
    UPDATE notes SET
      title = COALESCE(?, title),
      body = COALESCE(?, body),
      priority = COALESCE(?, priority),
      completed = COALESCE(?, completed),
      canceled = COALESCE(?, canceled),
      reminder_at = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    title || null,
    body !== undefined ? body : null,
    priority || null,
    completedVal,
    canceledVal,
    newReminder,
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

// PATCH /api/notes/:id/complete — toggle completion (clears canceled)
router.patch('/:id/complete', (req, res) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  const nowCompleted = note.completed ? 0 : 1;
  db.prepare('UPDATE notes SET completed = ?, canceled = 0, updated_at = ? WHERE id = ?')
    .run(nowCompleted, new Date().toISOString(), req.params.id);
  recordHistory(req.params.id, nowCompleted ? 'completed' : 'reactivated', 'completed', String(note.completed), String(nowCompleted));
  res.json(getNoteById(req.params.id));
});

// PATCH /api/notes/:id/cancel — toggle cancellation (clears completed)
router.patch('/:id/cancel', (req, res) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  const nowCanceled = note.canceled ? 0 : 1;
  db.prepare('UPDATE notes SET canceled = ?, completed = 0, updated_at = ? WHERE id = ?')
    .run(nowCanceled, new Date().toISOString(), req.params.id);
  recordHistory(req.params.id, nowCanceled ? 'canceled' : 'reactivated', 'canceled', String(note.canceled), String(nowCanceled));
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
