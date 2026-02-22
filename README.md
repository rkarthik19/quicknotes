# ⚡ QuickNotes

A full-stack notes application with time-based reminders, tags, priorities, file attachments, and search — available as a **Web app** and **React Native mobile app**.

---

## 📁 Project Structure

```
quicknotes/
├── backend/         # Node.js + Express + SQLite REST API
├── web/             # Vanilla JS single-page web app
└── mobile/          # React Native (Expo) mobile app
```

---

## 🚀 Backend Setup

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
The app uses **SQLite** (via `better-sqlite3`) — no external database setup required. The database file is automatically created at `backend/data/quicknotes.db` on first run.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | List notes (supports `?search=`, `?tag=`, `?priority=`, `?completed=`) |
| GET | `/api/notes/:id` | Get single note |
| POST | `/api/notes` | Create note |
| PUT | `/api/notes/:id` | Update note |
| PATCH | `/api/notes/:id/complete` | Toggle completion |
| DELETE | `/api/notes/:id` | Delete note |
| GET | `/api/tags` | List all tags |
| POST | `/api/tags` | Create tag |
| PUT | `/api/tags/:id` | Update tag |
| DELETE | `/api/tags/:id` | Delete tag |
| POST | `/api/attachments/:noteId` | Upload file attachment |
| GET | `/api/attachments/:id/download` | Serve/download attachment |
| DELETE | `/api/attachments/:id` | Delete attachment |

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

## 🌐 Web App Setup

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
- 📋 Create, edit, delete notes
- 🔍 Real-time search bar (always visible)
- 🏷 Tag filtering in sidebar
- 🟥🟧🟩 Color-coded priority badges
- ✅ Toggle notes as complete (with strikethrough)
- 🔔 Browser notifications for reminders (requests permission on load)
- 📎 File and image attachments
- 📅 Reminder date/time picker
- Responsive layout (mobile-friendly)

---

## 📱 Mobile App Setup (React Native / Expo)

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

## 🗄️ Database Schema

```sql
notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  priority TEXT DEFAULT 'medium',  -- 'high' | 'medium' | 'low'
  completed INTEGER DEFAULT 0,
  reminder_at TEXT,
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
```

---

## 🔔 Reminders

**Web:** The browser polls for upcoming reminders every 30 seconds and fires native browser notifications for notes with reminders due within the next 60 seconds. The browser must be open and notification permissions must be granted.

**Mobile:** Uses `expo-notifications` for local push notifications. Permission is requested on first launch.

---

## 📦 File Uploads

- Files are stored in `backend/uploads/` with UUID-based filenames
- Max upload size: **25MB per file**
- Accessible via `GET /uploads/:filename` (served as static files)
- Supported: any file type (images, PDFs, documents, etc.)

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| CORS errors | Ensure backend is running and `cors` middleware is active |
| Mobile can't reach API | Use your machine's local IP, not `localhost` |
| SQLite `SQLITE_CANTOPEN` | Ensure `backend/data/` directory exists (auto-created on start) |
| Notifications not firing | Check browser/device notification permissions |
| File upload fails | Check `backend/uploads/` folder exists and is writable |
