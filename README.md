# EduClass Mingle

Full specification + implementation scaffold, built exactly from the seven
systems in the brainstorm (Solo Study, Pomodoro, Notes, Group Study, Social
Media, Coins, Profile). No features were added beyond what was described.

## Structure

- `spec/` — the extracted, structured specification document.
- `supabase/schema.sql` — Postgres schema for Supabase, one table set per system.
- `backend/` — NestJS API, one module per system, talking to Supabase via
  the service role key.
- `frontend/` — React + Vite + TypeScript + Tailwind, using lucide-react
  icons throughout (no emoji anywhere in the UI).

## Setup

### 1. Supabase
Create a Supabase project, then run `supabase/schema.sql` in the SQL editor.
Also create a **public Storage bucket named `module-pdfs`** (Storage → New
bucket) — this is where uploaded PDFs land before the backend extracts
their text.

### 2. Backend
```
cd backend
npm install
cp .env.example .env   # fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
npm run start:dev
```

### 3. Frontend
```
cd frontend
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm run dev
```

## Notes on scope

**Implemented in this pass:**
- **PDF text extraction** — `backend/src/pdfs/` downloads each uploaded PDF
  and extracts its text with `pdf-parse`; `ModulesService.addPdf` stores the
  result in `module_sources` automatically. The frontend "Add PDF" button
  uploads to the `module-pdfs` Supabase Storage bucket, then registers the
  file with the backend.
- **AI provider call** — `backend/src/ai/ai.service.ts` calls OpenRouter
  (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL` in `.env`), asks for strict JSON,
  and inserts real flashcards/quiz questions/Q&A pairs/summaries into the
  database instead of placeholder rows.
- **WebRTC video-call signaling** — `RoomPage.tsx` implements a full mesh
  video call using **Supabase Realtime** (presence + broadcast) as the
  signaling channel, so no separate signaling server is needed. Uses only
  the public Google STUN server — add a TURN server to `ICE_SERVERS` in
  `RoomPage.tsx` if calls need to work across strict/symmetric NATs.

**Still intentionally left out:**
- **Auth** — skipped by request. There's no login/signup, session, or route
  guarding; `ownerId`/`userId` are passed around as plain params. Anyone can
  act as any user. Wiring in Supabase Auth (email/password or OAuth) is the
  natural next step and touches `frontend/src/lib/supabaseClient.ts`,
  a new `backend/src/auth/` guard, and every controller that currently
  takes a raw user id.
