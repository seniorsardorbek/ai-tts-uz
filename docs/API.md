# TTS API — Client Integration

Bitta HTTP endpoint orqali matnni ElevenLabs v3 bilan ovozga aylantirib, **streaming MP3** ko'rinishida qaytaradi. Cache server tomonida — bir xil so'rov ikkinchi marta deyarli darhol javob beradi.

---

## Base URL

Dev: `http://localhost:4000`

Production'da o'zingiznikiga almashtiring.

---

## `GET /api/tts`

### Query parametrlari

| Nom | Tip | Majburiy | Default | Tavsif |
|---|---|---|---|---|
| `text` | string | **ha** | — | Ovozga aylantiriladigan matn. Maks 1000 belgi. URL-encode qiling. |
| `g` | `"m"` \| `"f"` | yo'q | `f` | Ovoz jinsi. `m` = Liam, `f` = Jessica. |

Boshqa hech qanday parametr qabul qilinmaydi — yuborilsa ham e'tiborsiz qoldiriladi.

### Locked sozlamalar (server ichida)

- Provider: ElevenLabs v3 (`eleven_v3` model)
- Til: **multilingual auto-detect** — model matndan o'zi aniqlaydi (UZ/RU/EN/TR/RU va boshqalar)
- Voice settings: `school_teacher` profil (stability=0.6, similarity=0.75, style=0.15)

### Response

**Cache MISS** (birinchi marta):
```
HTTP/1.1 200 OK
Content-Type: audio/mpeg
Transfer-Encoding: chunked
Cache-Control: no-store
X-Cache: MISS

<MP3 chunklar oqim ko'rinishida>
```

**Cache HIT** (bir xil `text + g`):
```
HTTP/1.1 200 OK
Content-Type: audio/mpeg
Accept-Ranges: bytes
X-Cache: HIT

<to'liq MP3 fayl>
```

**Format**: MP3 / 44.1 kHz / 128 kbps / mono. Barcha brauzerlar va `<audio>` elementlari to'g'ridan-to'g'ri qo'llab-quvvatlaydi.

### Xatoliklar

| Status | Body | Sabab |
|---|---|---|
| 400 | `{"error":"text query param is required"}` | `text` yo'q yoki bo'sh |
| 413 | `{"error":"text must be <= 1000 chars"}` | Matn juda uzun |
| 500 | `{"error":"tts generation failed","message":"..."}` | ElevenLabs API xatosi, kalit yo'q va h.k. |

Noto'g'ri `g` (masalan `g=x`) — xato qaytarmaydi, **default `f`** ga tushadi.

---

## `GET /api/tts/options`

Backend tomonidan tasdiqlangan tanlovlar (frontenda toggle uchun).

```json
{
  "genders": ["m", "f"],
  "defaultGender": "f"
}
```

---

## Cache xatti-harakati

- Cache key = `sha256(g | normalize(text))`
- `normalize(text)` = `NFC → trim → lowercase → ko'p bo'shliqlarni bittaga → oxirgi tinish belgisini olib tashlash`
- Fayl yo'li: `server/cache/<g>/<hash>.mp3`
- Hash har doim 64 belgi, fayl nomi har doim 68 belgi (`.mp3` bilan)

---

## Client misollar

### 1. Eng sodda — HTML5 `<audio>`

```html
<audio id="player" controls></audio>
<script>
  const text = "Madinada ikkita olma bor edi...";
  const params = new URLSearchParams({ text, g: "f" });
  document.getElementById("player").src =
    `http://localhost:4000/api/tts?${params}`;
  document.getElementById("player").play();
</script>
```

Brauzer chunked MP3'ni avtomatik progressively decode qiladi. Hech qanday qo'shimcha streaming kod kerak emas.

### 2. Fetch + Blob (yuklab olish)

```ts
async function fetchTts(text: string, g: "m" | "f" = "f"): Promise<Blob> {
  const params = new URLSearchParams({ text, g });
  const res = await fetch(`http://localhost:4000/api/tts?${params}`);
  if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
  return res.blob();
}

const blob = await fetchTts("Salom dunyo", "f");
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

  const play = (text: string, g: "m" | "f" = "f") => {
    if (!audioRef.current) return;
    setBusy(true);
    const params = new URLSearchParams({ text, g });
    audioRef.current.src = `${API_BASE}/api/tts?${params}`;
    audioRef.current.play().catch(() => setBusy(false));
  };

  return {
    audioRef,
    play,
    busy,
    onPlaying: () => setBusy(false),
    onError: () => setBusy(false),
  };
}

function Speak() {
  const { audioRef, play, busy, onPlaying, onError } = useTts();
  return (
    <>
      <button onClick={() => play("Salom dunyo", "f")} disabled={busy}>
        {busy ? "..." : "Eshitish"}
      </button>
      <audio ref={audioRef} controls onPlaying={onPlaying} onError={onError} />
    </>
  );
}
```

### 4. Vue 3

```vue
<script setup lang="ts">
import { ref } from "vue";
const audio = ref<HTMLAudioElement | null>(null);
const text = ref("");
const gender = ref<"m" | "f">("f");
const speak = () => {
  if (!audio.value || !text.value.trim()) return;
  const p = new URLSearchParams({ text: text.value, g: gender.value });
  audio.value.src = `http://localhost:4000/api/tts?${p}`;
  audio.value.play();
};
</script>

<template>
  <textarea v-model="text"></textarea>
  <select v-model="gender">
    <option value="f">Jessica</option>
    <option value="m">Liam</option>
  </select>
  <button @click="speak">Eshitish</button>
  <audio ref="audio" controls></audio>
</template>
```

### 5. cURL

```bash
# Standart (Jessica)
curl -G "http://localhost:4000/api/tts" \
  --data-urlencode "text=Salom dunyo" \
  -o out.mp3

# Erkak ovoz (Liam)
curl -G "http://localhost:4000/api/tts" \
  --data-urlencode "text=Salom dunyo" \
  --data-urlencode "g=m" \
  -o out.mp3

# Cache holatini tekshirish
curl -I -G "http://localhost:4000/api/tts" \
  --data-urlencode "text=Salom dunyo" \
  --data-urlencode "g=f"
# X-Cache: HIT  yoki  X-Cache: MISS
```

### 6. React Native / mobile

```ts
import { Audio } from "expo-av";

async function speak(text: string, g: "m" | "f" = "f") {
  const url = `http://your-server/api/tts?text=${encodeURIComponent(text)}&g=${g}`;
  const { sound } = await Audio.Sound.createAsync({ uri: url });
  await sound.playAsync();
}
```

---

## CORS

Server `Access-Control-Allow-Origin` ni `.env`'dagi `CLIENT_ORIGIN` qiymatiga o'rnatadi (default: `http://localhost:5173`). Boshqa origin'dan murojaat qilsangiz `.env`'ni yangilang.

---

## Performance

- **First byte → first sound**: ~500-1500 ms (ElevenLabs latency)
- **Cache hit**: ~10-50 ms (disk read + Range support)
- **Fayl o'lchami**: ~16 KB/sek audio (128 kbps MP3)
- **Bandwidth**: ~128 kbps streamingda

---

## TypeScript

```ts
export type Gender = "m" | "f";

export interface TtsRequest {
  text: string;
  g?: Gender;
}

export function ttsUrl(base: string, req: TtsRequest): string {
  const p = new URLSearchParams({ text: req.text });
  if (req.g) p.set("g", req.g);
  return `${base}/api/tts?${p}`;
}
```

---

## Minimal contract

```
GET /api/tts?text=<sentence>&g=<m|f>
→ audio/mpeg (streamed MP3)
```

`g` ham opsional → eng sodda variant: `GET /api/tts?text=...` → Jessica (ayol ovozi) bilan eshitiladi.
