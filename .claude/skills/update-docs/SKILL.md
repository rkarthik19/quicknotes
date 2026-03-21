---
name: update-docs
description: Update README.md and MEMORY.md to reflect the current state of the project. Use after implementing a new feature, changing the API, or modifying the database schema.
disable-model-invocation: true
---

Update the project's documentation files to reflect the current state of the codebase.

## Step 1: Gather current state

Read these files to understand what has changed:
- `backend/src/db/database.js` — current schema and migrations
- `backend/src/routes/notes.js` — API endpoints and their parameters
- `backend/src/routes/tags.js` — tag endpoints
- `backend/src/routes/attachments.js` — attachment endpoints
- `backend/src/index.js` — middleware and route mounting
- `web/index.html` — frontend features, filters, UI components
- Run `git log --oneline -10` to see recent commits

## Step 2: Update README.md

Ensure these sections are accurate:
- **Project Structure** — directory layout
- **API Endpoints** — table with Method, Endpoint, Description for all routes
- **Database Schema** — SQL table definitions matching actual schema
- **Features** — organized by category (Core, Organization & Filtering, Status Management, Dashboard, Activity Log, Preferences, Notifications)
- **Reminders** — web, backend, and mobile notification approaches
- **File Uploads** — storage location, limits
- **Troubleshooting** — common issues and solutions

## Step 3: Update MEMORY.md

Update the memory file at the path shown in the conversation context. Ensure these sections are accurate:
- **Key Files** — table of important files and their purpose
- **Database Schema** — field summaries for each table
- **API Endpoints** — list with query params and behavior notes
- **Frontend Architecture** — activeFilter, key functions, rendering flow
- **Features Implemented** — bullet list of all features
- **Git History** — table of recent commits on the current branch
- **Uncommitted Changes** — current status

## Rules
- Do NOT add or remove sections — only update existing content
- Keep the same formatting conventions already used in each file
- Be concise — MEMORY.md should stay under 200 lines
- Only update what has actually changed — do not rewrite unchanged sections
- Show a diff summary of what you changed when done
