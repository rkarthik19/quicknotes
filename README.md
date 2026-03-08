# QuickNotes

A full-stack notes application with priorities, tags, reminders, file attachments, activity tracking, and a dashboard — available as a **Web app** and **React Native mobile app**.

---

## Project Structure

```
quicknotes/
├── backend/         # Node.js + Express + SQLite REST API
├── web/             # Vanilla JS single-page web app
└── mobile/          # React Native (Expo) mobile app
```

---

## Backend Setup

### Prerequisites
- Node.js 18+
- npm

### Install & Run

```bash
cd backend
npm install

# Copy env file
cp .env.example .env

# Start the server (production)
npm start

# Start with auto-reload (development)
npm run dev
```

The API will be available at **http://localhost:3001**

### Database
The app uses **SQLite** (via `better-sqlite3`) — no external database setup required. The database file is automatically created at `backend/data/quicknotes.db` on first run. Migrations run automatically on startup.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | List notes (supports `?search=`, `?tag=`, `?priority=`, `?completed=`, `?canceled=`, `?due=overdue\|today\|week`) |
| GET | `/api/notes/stats` | Dashboard counts: overdue, due today, due this week |
| GET | `/api/notes/:id` | Get single note with tags and attachments |
| GET | `/api/notes/:id/history` | Get activity log for a note |
| POST | `/api/notes` | Create note |
| PUT | `/api/notes/:id` | Update note (all fields) |
| PATCH | `/api/notes/:id/complete` | Toggle completion (clears canceled) |
| PATCH | `/api/notes/:id/cancel` | Toggle cancellation (clears completed) |
| DELETE | `/api/notes/:id` | Delete note |
| GET | `/api/tags` | List all tags |
| POST | `/api/tags` | Create tag |
| DELETE | `/api/tags/:id` | Delete tag |
| POST | `/api/attachments/:noteId` | Upload file attachment |
| DELETE | `/api/attachments/:id` | Delete attachment |

**Default sort:** Notes with due dates appear first (ascending), then by priority (high > medium > low), then by creation date (newest first).

### Example: Create a Note

```bash
curl -X POST http://localhost:3001/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Meeting notes",
    "body": "Discuss Q1 roadmap",
    "priority": "high",
    "reminder_at": "2025-03-01T09:00:00.000Z",
    "tag_ids": []
  }'
```

---

## Web App Setup

### Prerequisites
- Backend running at http://localhost:3001

### Run

The web app is a **single HTML file** — no build step needed.

```bash
# Option 1: Open directly in browser
open web/index.html

# Option 2: Serve with any static server
cd web
npx serve .
# or
python3 -m http.server 8080
```

Then visit **http://localhost:8080**

### Features

**Core**
- Create, edit, delete notes with title, body, and priority (high/medium/low)
- Color-coded priority badges and left border indicators
- Real-time search (debounced 300ms, searches title + body)
- File and image attachments per note
- Reminder date/time picker

**Organization & Filtering**
- Tag system — color-coded tags, managed via Tags modal, filterable from sidebar
- Sidebar filters: All Notes, Due Today, Completed, Canceled, With Reminder, and by priority
- Filter chips: All, Active, Done, Canceled, High, Medium, Low
- Reset Filters button to clear all active filters at once

**Status Management**
- Toggle notes as completed (strikethrough, dimmed)
- Cancel notes (gray border, strikethrough, "canceled" badge) — mutually exclusive with completed
- Canceled and completed notes hidden from default view

**Dashboard**
- Summary bar with Overdue, Due Today, and This Week counts
- Clickable summary cards to filter by due status
- Auto-hides when all counts are zero
- Overdue notes highlighted with red-tinted background and border

**Activity Log**
- Per-note timeline shown in the edit modal
- Tracks: creation, completion, cancellation, reactivation
- Tracks field changes: title, body, priority, reminder with old/new values
- Visual timeline with color-coded dots and timestamps

**Preferences**
- Light/dark theme toggle via Preferences modal
- Respects system `prefers-color-scheme` on first visit
- Theme persists across sessions (localStorage)

**Notifications**
- Browser notification polling every 30 seconds
- Native macOS notifications via `terminal-notifier` (backend)
- Canceled/completed notes excluded from reminders

---

## Mobile App Setup (React Native / Expo)

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- For iOS: Xcode (macOS only)
- For Android: Android Studio or Expo Go app on your phone

### Install

```bash
cd mobile
npm install
```

### Configure API URL

If running on a **physical device** or **Android emulator**, update the `BASE_URL` in `src/services/api.js`:

```js
// Replace with your machine's local IP address
const BASE_URL = 'http://192.168.1.100:3001/api';
```

For iOS Simulator or web, `localhost` works fine.

### Run

```bash
# Start Expo development server
npm start

# Or run on specific platform
npm run ios       # iOS Simulator
npm run android   # Android emulator
npm run web       # Web browser
```

Then scan the QR code with the **Expo Go** app on your phone.

### Mobile Features
- Full CRUD for notes
- Priority-based color indicators
- Tag creation and filtering
- Date/time picker for reminders
- Push notification permissions requested on launch
- Document picker for file attachments
- Pull-to-refresh
- Dark theme throughout

---

## Database Schema

```sql
notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  priority TEXT DEFAULT 'medium',  -- 'high' | 'medium' | 'low'
  completed INTEGER DEFAULT 0,
  canceled INTEGER DEFAULT 0,      -- mutually exclusive with completed
  reminder_at TEXT,                 -- ISO 8601 datetime
  created_at TEXT,
  updated_at TEXT
)

tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE,
  color TEXT DEFAULT '#6366f1',
  created_at TEXT
)

note_tags (
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
)

attachments (
  id TEXT PRIMARY KEY,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  filename TEXT,          -- stored filename on disk
  original_name TEXT,     -- user's original filename
  mime_type TEXT,
  size INTEGER,
  created_at TEXT
)

note_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  action TEXT NOT NULL,   -- 'created' | 'updated' | 'completed' | 'canceled' | 'reactivated'
  field TEXT,             -- which field changed (for 'updated' action)
  old_value TEXT,
  new_value TEXT,
  created_at TEXT
)
```

---

## Reminders

**Web:** The browser polls for upcoming reminders every 30 seconds and fires native browser notifications for notes with reminders due within the next 60 seconds. The browser must be open and notification permissions must be granted.

**Backend:** A polling service checks every 60 seconds and sends native macOS notifications via `terminal-notifier` (requires `brew install terminal-notifier`).

**Mobile:** Uses `expo-notifications` for local push notifications. Permission is requested on first launch.

---

## File Uploads

- Files are stored in `backend/uploads/` with UUID-based filenames
- Max upload size: **25MB per file**
- Accessible via `GET /uploads/:filename` (served as static files)
- Supported: any file type (images, PDFs, documents, etc.)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| CORS errors | Ensure backend is running and `cors` middleware is active |
| Mobile can't reach API | Use your machine's local IP, not `localhost` |
| SQLite `SQLITE_CANTOPEN` | Ensure `backend/data/` directory exists (auto-created on start) |
| Notifications not firing | Check browser/device notification permissions |
| File upload fails | Check `backend/uploads/` folder exists and is writable |
| macOS notifications not showing | Install `terminal-notifier` via `brew install terminal-notifier` |
