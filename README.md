# ai-tts-uz — monorepo (NestJS + React + Postgres)

Uzbek TTS + AI grading service, with usage analytics in Postgres.

```
apps/
  api/   NestJS (Express) — /api/tts, /api/grade, /api/cache, /health
  web/   React + Vite + react-router — /  (TTS)  ·  /cache  (cache admin)
packages/
  shared/  shared TS types/DTOs used by api + web
```

## Stack
- **api**: NestJS, TypeORM (`synchronize: true`, snake_case columns), Postgres, `@google/genai` (grading), ElevenLabs (TTS), ffmpeg (voice transcode).
- **web**: React 19, Vite, Tailwind v4, served under base `/ms/lesson-runner/`.
- **db**: 3 tables — `cache_entries` (dedup metadata), `tts_requests` + `grading_records` (analytics, fire-and-forget writes).

## Local dev
1. Postgres running locally with a DB named `coddyjuniorms` (see `apps/api/.env`).
2. Install: `npm install` (root) then `npm run build:shared`.
3. API: `npm run dev:api`  → http://localhost:4000  (creates tables on first boot).
4. Web: `npm run dev:web`  → http://localhost:5173/ms/lesson-runner/ (proxies `/api` → :4000).

## Endpoints (unchanged contract, backward compatible)
- `GET  /api/tts?text=&g=m|f` — streaming MP3. Optional analytics: `lesson_id`, `student_uuid`, `lesson_name`.
- `POST /api/grade` — JSON (text) or multipart (voice `audio`). Same optional fields. Returns `{ correct, feedback, transcript? }`.
- `GET  /api/cache` · `GET /api/cache/:g/:key/audio` · `POST /api/cache/:g/:key/delete` (+ `DELETE`).

## Build
`npm run build` (shared → api → web). Web base path is `/ms/lesson-runner/`; build with `VITE_API_BASE=https://crm.junior-it.uz/ms/lesson-runner` for production.
