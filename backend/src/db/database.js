const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/quicknotes.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
    completed INTEGER NOT NULL DEFAULT 0,
    reminder_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6366f1',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS note_tags (
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_notes_priority ON notes(priority);
  CREATE INDEX IF NOT EXISTS idx_notes_completed ON notes(completed);
  CREATE INDEX IF NOT EXISTS idx_notes_reminder ON notes(reminder_at);
  CREATE INDEX IF NOT EXISTS idx_attachments_note ON attachments(note_id);
  CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags(note_id);
  CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id);
`);

// Migration: add canceled column if it doesn't exist
const cols = db.pragma('table_info(notes)').map(c => c.name);
if (!cols.includes('canceled')) {
  db.exec('ALTER TABLE notes ADD COLUMN canceled INTEGER NOT NULL DEFAULT 0');
}

module.exports = db;
