const { execFile } = require('child_process');
const db = require('./db/database');

const CHECK_INTERVAL_MS = 60 * 1000; // check every 60 seconds
const LOOKAHEAD_MS = 65 * 1000;      // fire if due within next 65 seconds
const notifiedIds = new Set();        // track already-fired reminders
const NOTIFIER_PATH = '/opt/homebrew/bin/terminal-notifier';

function sendNotification(title, message) {
  execFile(NOTIFIER_PATH, ['-title', title, '-message', message, '-sound', 'default'], (err) => {
    if (err) console.error('Notification error:', err.message);
  });
}

function checkReminders() {
  try {
    const now = new Date();
    const soon = new Date(now.getTime() + LOOKAHEAD_MS);

    const notes = db.prepare(`
      SELECT id, title, reminder_at FROM notes
      WHERE completed = 0
        AND reminder_at IS NOT NULL
        AND reminder_at >= ?
        AND reminder_at <= ?
    `).all(now.toISOString(), soon.toISOString());

    for (const note of notes) {
      if (notifiedIds.has(note.id)) continue;
      notifiedIds.add(note.id);

      const remTime = new Date(note.reminder_at);
      const delay = Math.max(0, remTime - now);

      setTimeout(() => {
        sendNotification('QuickNotes Reminder', note.title);
        console.log(`🔔 Reminder fired: "${note.title}"`);
      }, delay);
    }
  } catch (err) {
    console.error('Reminder check error:', err.message);
  }
}

function startReminderService() {
  console.log('🔔 Reminder service started');
  checkReminders();
  setInterval(checkReminders, CHECK_INTERVAL_MS);
}

module.exports = { startReminderService };
