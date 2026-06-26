# Cache admin sahifa (React)

TTS cache'dagi saqlangan speech fayllarni ko'rsatadi: matn, yaratilgan vaqt, ovoz (gender), hajm — audio preview va o'chirish bilan.

## Ishlatish
1. `CacheAdmin.tsx` ni React loyihangizga ko'chiring.
2. Yuqoridagi `API_BASE` ni TTS server manziliga sozlang (default `http://13.140.151.160`).
3. Bir route'ga ulang, masalan:
   ```tsx
   import CacheAdmin from "./CacheAdmin";
   // <Route path="/cache" element={<CacheAdmin />} />
   ```

## Talablar
- React 18+ (hooks). Qo'shimcha kutubxona/CSS framework shart emas (inline style).
- Sahifa ishlaydigan **origin** TTS serverning CORS allowlist'ida bo'lishi kerak
  (hozir: `localhost:5173`, `localhost:5174`, `juniorit.vercel.app`, `go.junior-it.uz`).
  Boshqa origin bo'lsa, serverda `CORS_ORIGINS` (index.js) va nginx `cors-allowlist.conf` ga qo'shing.

## API (server tomonidan beriladi)
- `GET  /api/cache` → `{ total, totalBytes, items: [{ key, gender, text|null, createdAt, sizeBytes }] }`
- `GET  /api/cache/:gender/:key/audio` → mp3 (Range qo'llaydi) — preview
- `DELETE /api/cache/:gender/:key` → `{ ok: true }`

## Eslatma
Cache fayl nomi `sha256(gender|text)` — bir tomonlama. Shu sababli **bu funksiya qo'shilishidan oldin**
yaratilgan fayllar matnsiz ("— eski") ko'rinadi; preview/o'chirish ular uchun ham ishlaydi.
Yangi fayllar matn bilan saqlanadi.
