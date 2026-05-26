# TTS API — Client Integration

Bitta HTTP endpoint orqali matnni Gemini TTS bilan ovozga aylantirib, **streaming WAV** ko'rinishida qaytaradi. Cache server tomonida — bir xil so'rov ikkinchi marta deyarli darhol javob beradi.

---

## Base URL

Dev: `http://localhost:4000`

Production'da: o'zingiznikiga almashtiring.

---

## Endpoints

### `GET /api/tts`

Asosiy endpoint — matnni audio oqimga aylantiradi.

#### Query parametrlari

| Nom | Tip | Majburiy | Default | Tavsif |
|---|---|---|---|---|
| `text` | string | **ha** | — | Ovozga aylantiriladigan matn. Maks 1000 belgi. URL-encode qiling. |
| `lang` | `"uz"` \| `"ru"` | yo'q | `uz` | Til. |
| `voice` | string | yo'q | `Sadaltager` | Gemini voice ID. Ro'yxat pastda. |
| `mood` | string | yo'q | `math_teacher` | Kayfiyat/persona. Ro'yxat pastda. |

#### Voice ID lar

`Sadaltager` · `Charon` · `Sulafat` · `Aoede` · `Achird` · `Vindemiatrix` · `Kore` · `Puck` · `Zephyr` · `Algieba`

#### Mood ID lar

`default` (oddiy) · `math_teacher` (matematika ustozi) · `novel_reader` (roman o'quvchisi) · `school_teacher` (maktab o'qituvchisi) · `journalist` (jurnalist)

Mood server tomonida matn boshiga style instruction prefiks sifatida qo'shiladi (masalan `"Matematika o'qituvchisi kabi… <matn>"`) — Gemini shu ohangda o'qiydi.

#### Response

**Cache MISS** (birinchi marta):
```
HTTP/1.1 200 OK
Content-Type: audio/wav
Transfer-Encoding: chunked
Cache-Control: no-store
X-Cache: MISS

<WAV header (44 bayt) + PCM chunklar oqim ko'rinishida>
```

**Cache HIT** (bir xil parametrlar takrorlansa):
```
HTTP/1.1 200 OK
Content-Type: audio/wav
Content-Length: <aniq o'lcham>
Accept-Ranges: bytes
X-Cache: HIT

<to'liq WAV fayl>
```

**Format:** WAV / PCM 16-bit LE / 24 kHz / mono. Hech qanday qo'shimcha decoding kerak emas — barcha brauzerlar va `<audio>` elementlari to'g'ridan-to'g'ri qo'llab-quvvatlaydi.

#### Xatoliklar

| Status | Body | Sabab |
|---|---|---|
| 400 | `{"error":"text query param is required"}` | `text` yo'q yoki bo'sh |
| 413 | `{"error":"text must be <= 1000 chars"}` | Matn juda uzun |
| 500 | `{"error":"tts generation failed","message":"..."}` | Gemini API xatoligi, kalit yo'q, va h.k. |

Noto'g'ri `lang` / `voice` / `mood` — xato qaytarmaydi, **default'ga tushadi**.

---

### `GET /api/tts/options`

Backend tomondan tasdiqlangan tanlovlar ro'yxati (frontenda dropdown to'ldirish uchun).

#### Response

```json
{
  "langs": ["uz", "ru"],
  "defaultLang": "uz",
  "voices": [
    { "id": "Sadaltager", "label": "Sadaltager — knowledgeable" },
    { "id": "Charon",     "label": "Charon — informative, clear" },
    ...
  ],
  "defaultVoice": "Sadaltager",
  "moods": [
    { "id": "default",      "label": { "uz": "Oddiy",            "ru": "Обычный" } },
    { "id": "math_teacher", "label": { "uz": "Matematika ustozi", "ru": "Учитель математики" } },
    ...
  ],
  "defaultMood": "math_teacher"
}
```

---

## Streaming xatti-harakati

- **Birinchi so'rovda**: server Gemini'dan kelgan PCM chunklarni darhol HTTP response'ga yozadi (chunked transfer). Brauzer 100-500 ms ichida birinchi tovushlarni eshita boshlaydi — to'liq faylni kutmasdan.
- **Cache yozish**: shu paytda server fonida xuddi shu chunklarni faylga ham yozadi (`server/cache/<lang>/<hash>.wav`). Stream tugagach, WAV header'dagi size'lar to'g'rilanadi.
- **Keyingi so'rov**: bir xil `text+lang+voice+mood` kombinatsiyasi → fayldan to'g'ridan-to'g'ri stream (Range so'rovlari ham qo'llab-quvvatlanadi).

**Cache key** = `sha256(lang|voice|mood|normalize(text))`.

**`normalize(text)`** = `trim → lowercase → ko'p bo'shliqlarni bittaga → oxirgi tinish belgisini olib tashlash`.

---

## Client misollar

### 1. Eng sodda — HTML5 `<audio>` (tavsiya etiladi)

```html
<audio id="player" controls></audio>
<script>
  const text = "Madinada ikkita olma bor edi...";
  const params = new URLSearchParams({ text, lang: "uz" });
  document.getElementById("player").src =
    `http://localhost:4000/api/tts?${params}`;
  document.getElementById("player").play();
</script>
```

Brauzer chunked WAV'ni avtomatik progressively decode qiladi. Hech qanday MediaSource yoki Web Audio kerak emas.

### 2. Fetch + Blob (yuklab olish yoki keyinroq ijro etish)

```ts
async function fetchTts(text: string, lang: "uz" | "ru" = "uz"): Promise<Blob> {
  const params = new URLSearchParams({ text, lang });
  const res = await fetch(`http://localhost:4000/api/tts?${params}`);
  if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
  return res.blob();
}

// Ishlatish:
const blob = await fetchTts("Salom dunyo", "uz");
const url = URL.createObjectURL(blob);
audio.src = url;
```

⚠️ Bu yondashuv to'liq audio yuklab olinmaguncha kutadi — streaming foydasini yo'qotadi. Faqat **download** kerak bo'lganda ishlating.

### 3. React hook

```tsx
import { useRef, useState } from "react";

const API_BASE = "http://localhost:4000";

export function useTts() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const play = (text: string, opts?: { lang?: "uz" | "ru"; voice?: string; mood?: string }) => {
    if (!audioRef.current) return;
    setError(null);
    setBusy(true);
    const params = new URLSearchParams({ text, lang: opts?.lang ?? "uz" });
    if (opts?.voice) params.set("voice", opts.voice);
    if (opts?.mood)  params.set("mood",  opts.mood);
    audioRef.current.src = `${API_BASE}/api/tts?${params}`;
    audioRef.current.play().catch((e) => setError(String(e)));
  };

  return {
    audioRef,
    play,
    busy,
    error,
    onPlaying: () => setBusy(false),
    onError:   () => { setBusy(false); setError("Audio yuklab bo'lmadi"); },
  };
}

// Komponentda:
function Speak() {
  const { audioRef, play, busy, onPlaying, onError } = useTts();
  return (
    <>
      <button onClick={() => play("Salom dunyo")} disabled={busy}>
        {busy ? "..." : "Eshitish"}
      </button>
      <audio ref={audioRef} controls onPlaying={onPlaying} onError={onError} />
    </>
  );
}
```

### 4. Vue 3 (Composition API)

```vue
<script setup lang="ts">
import { ref } from "vue";
const audio = ref<HTMLAudioElement | null>(null);
const text = ref("");
const speak = () => {
  if (!audio.value || !text.value.trim()) return;
  const p = new URLSearchParams({ text: text.value, lang: "uz" });
  audio.value.src = `http://localhost:4000/api/tts?${p}`;
  audio.value.play();
};
</script>

<template>
  <textarea v-model="text"></textarea>
  <button @click="speak">Eshitish</button>
  <audio ref="audio" controls></audio>
</template>
```

### 5. cURL (test va debug uchun)

```bash
# Streaming + faylga saqlash
curl -G "http://localhost:4000/api/tts" \
  --data-urlencode "text=Salom dunyo" \
  --data-urlencode "lang=uz" \
  -o out.wav

# Cache hit'ni tekshirish (header'larga qarang)
curl -I -G "http://localhost:4000/api/tts" \
  --data-urlencode "text=Salom dunyo" \
  --data-urlencode "lang=uz"
# X-Cache: HIT  yoki  X-Cache: MISS
```

### 6. React Native / mobile

```ts
import { Audio } from "expo-av";

async function speak(text: string) {
  const url = `http://your-server/api/tts?text=${encodeURIComponent(text)}&lang=uz`;
  const { sound } = await Audio.Sound.createAsync({ uri: url });
  await sound.playAsync();
}
```

Mobile pleyer ham streaming WAV'ni tabiiy tarzda qo'llab-quvvatlaydi.

---

## CORS

Server `Access-Control-Allow-Origin` ni `.env`'dagi `CLIENT_ORIGIN` qiymatiga o'rnatadi (default: `http://localhost:5173`). Boshqa origin'dan murojaat qilsangiz `.env`'ni yangilang yoki bir nechta origin'ni qo'llab-quvvatlash uchun [server/src/index.js](../server/src/index.js)'dagi CORS sozlamasini kengaytiring.

---

## Performance notalari

- **Birinchi tovush (first byte → first sound)**: ~500-1500 ms (Gemini latency'ga bog'liq)
- **Cache hit**: ~10-50 ms (disk read)
- **Fayl o'lchami** (24 kHz mono PCM): ~48 KB/sekund audio
- **Bandwidth**: ~384 kbps streamingda (PCM raw, kompressiya yo'q)

**Optimizatsiya maslahatlari:**
- Bir xil takrorlanadigan matnlar uchun cache foydali (masalan, ovozli xabarlar shabloni)
- Uzun matnlar uchun (>500 belgi) Gemini'ning ham latency'si oshadi — qisqaroq bo'laklarga bo'ling
- Production'da nginx'da statik cache fayllarni `server/cache/` orqali to'g'ridan-to'g'ri CDN'ga proxy qilish mumkin

---

## TypeScript tiplari

Ehtiyojingiz bo'lsa, client'da quyidagilarni nusxa oling:

```ts
export type Lang = "uz" | "ru";

export type Voice =
  | "Sadaltager" | "Charon" | "Sulafat" | "Aoede" | "Achird"
  | "Vindemiatrix" | "Kore" | "Puck" | "Zephyr" | "Algieba";

export type Mood =
  | "default" | "math_teacher" | "novel_reader"
  | "school_teacher" | "journalist";

export interface TtsRequest {
  text: string;
  lang?: Lang;
  voice?: Voice;
  mood?: Mood;
}

export function ttsUrl(base: string, req: TtsRequest): string {
  const p = new URLSearchParams({ text: req.text });
  if (req.lang)  p.set("lang",  req.lang);
  if (req.voice) p.set("voice", req.voice);
  if (req.mood)  p.set("mood",  req.mood);
  return `${base}/api/tts?${p}`;
}
```

---

## Minimal contract (qisqacha)

```
GET /api/tts?text=<sentence>&lang=uz
→ audio/wav (streamed)
```

Faqat shu ikki parametr bo'lsa ham yetadi — qolgani server default'idan keladi. Voice/mood'ni o'zgartirish faqat eksperiment yoki advanced foydalanish uchun.
