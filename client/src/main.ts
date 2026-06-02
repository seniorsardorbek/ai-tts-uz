import "./style.css";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";

type LangId = "uz" | "ru";
type ProviderId = "elevenlabs" | "gemini";
type MoodId = "default" | "math_teacher" | "novel_reader" | "school_teacher" | "journalist";

const SAMPLES: Record<LangId, string> = {
  uz: "Madinada ikkita olma bor edi lekin Sardor bittasini tortib oldi, Madinada nechta olma qoldi",
  ru: "У Мадины было два яблока, но Сардор забрал одно. Сколько яблок осталось у Мадины?",
};

interface Option<T extends string> { id: T; label: string }

const LANGS: Option<LangId>[] = [
  { id: "uz", label: "O'zbek" },
  { id: "ru", label: "Русский" },
];

const PROVIDERS: Option<ProviderId>[] = [
  { id: "gemini",     label: "Gemini" },
  { id: "elevenlabs", label: "ElevenLabs v3" },
];

const GEMINI_VOICES: Option<string>[] = [
  { id: "Sadaltager",   label: "Sadaltager — knowledgeable" },
  { id: "Charon",       label: "Charon — informative" },
  { id: "Sulafat",      label: "Sulafat — warm" },
  { id: "Aoede",        label: "Aoede — breezy" },
  { id: "Achird",       label: "Achird — friendly" },
  { id: "Vindemiatrix", label: "Vindemiatrix — gentle" },
  { id: "Kore",         label: "Kore — firm" },
  { id: "Puck",         label: "Puck — upbeat" },
  { id: "Zephyr",       label: "Zephyr — bright" },
  { id: "Algieba",      label: "Algieba — smooth" },
];

const ELEVENLABS_VOICES: Option<string>[] = [
  { id: "XB0fDUnXU5powFXDhCwa", label: "Charlotte — mature female" },
  { id: "pNInz6obpgDQGcFmaJgB", label: "Adam — deep male" },
  { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel — calm female" },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah — friendly female" },
  { id: "nPczCjzI2devNBz1zQrb", label: "Brian — friendly male" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam — articulate male" },
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "George — warm male" },
  { id: "cgSgspJ2msm6clMCkdW9", label: "Jessica — youthful female" },
];

// Initial fallback; replaced at runtime by the server's /api/tts/options
// (ElevenLabs voices are fetched live there — all account voices, Turkic first).
let VOICES: Record<ProviderId, Option<string>[]> = {
  gemini: GEMINI_VOICES,
  elevenlabs: ELEVENLABS_VOICES,
};

let DEFAULT_VOICE: Record<ProviderId, string> = {
  gemini: "Sadaltager",
  elevenlabs: "ZaoBgxgzPhoCm533Pb7B", // Zeynep (TR)
};

const MOODS: Record<LangId, Option<MoodId>[]> = {
  uz: [
    { id: "default",        label: "Oddiy" },
    { id: "math_teacher",   label: "Matematika ustozi" },
    { id: "novel_reader",   label: "Roman o'quvchisi" },
    { id: "school_teacher", label: "Maktab o'qituvchisi" },
    { id: "journalist",     label: "Jurnalist" },
  ],
  ru: [
    { id: "default",        label: "Обычный" },
    { id: "math_teacher",   label: "Учитель математики" },
    { id: "novel_reader",   label: "Чтец романа" },
    { id: "school_teacher", label: "Школьный учитель" },
    { id: "journalist",     label: "Журналист" },
  ],
};

const UI = {
  uz: {
    eyebrow: "Multi-provider TTS · Stream",
    title: "Ovozli o'qib berish",
    subtitle: "Bitta gap yozing — ovoz darhol oqim qilib eshitiladi.",
    matn: "Matn",
    placeholder: "Bu yerga gap yozing…",
    sample: "Namuna gap qo'yish",
    play: "Eshitish",
    busy: "Yuklanmoqda…",
    empty: "Matn kiriting.",
    starting: "Oqim boshlanmoqda…",
    playing: "Eshitilmoqda…",
    autoplayFail: "Avtomatik ijro ishlamadi — pleerda Play tugmasini bosing.",
    loadFail: "Audio yuklab bo'lmadi. Server ishga tushganmi va kalit o'rnatilganmi?",
    ended: "Tugadi.",
    provider: "Provayder",
    lang: "Til",
    voice: "Ovoz",
    mood: "Kayfiyat",
    footer: "ElevenLabs v3 · O'zbek uchun turkcha fonetika + transliteratsiya qo'llaniladi.",
  },
  ru: {
    eyebrow: "Multi-provider TTS · Stream",
    title: "Озвучка текста",
    subtitle: "Введите одно предложение — голос начнётся сразу, потоком.",
    matn: "Текст",
    placeholder: "Введите предложение…",
    sample: "Вставить пример",
    play: "Слушать",
    busy: "Загрузка…",
    empty: "Введите текст.",
    starting: "Начинается поток…",
    playing: "Воспроизведение…",
    autoplayFail: "Автовоспроизведение не сработало — нажмите Play в плеере.",
    loadFail: "Не удалось загрузить аудио. Сервер запущен и ключ установлен?",
    ended: "Готово.",
    provider: "Провайдер",
    lang: "Язык",
    voice: "Голос",
    mood: "Настроение",
    footer: "ElevenLabs v3 — высокое качество, особенно для русского.",
  },
} as const;

const state = {
  provider: "gemini" as ProviderId,
  lang: "uz" as LangId,
  voice: DEFAULT_VOICE.gemini,
  mood: "math_teacher" as MoodId,
};

const root = document.getElementById("app")!;

function optionsHtml<T extends string>(opts: Option<T>[], selected: T) {
  return opts
    .map((o) => `<option value="${o.id}"${o.id === selected ? " selected" : ""}>${o.label}</option>`)
    .join("");
}

function ensureVoiceValid() {
  const list = VOICES[state.provider];
  if (!list.some((v) => v.id === state.voice)) {
    state.voice = DEFAULT_VOICE[state.provider];
  }
}

function render() {
  const t = UI[state.lang];
  ensureVoiceValid();
  root.innerHTML = /* html */ `
    <main class="min-h-full flex items-center justify-center px-4 py-10">
      <div class="w-full max-w-2xl">
        <header class="mb-6 text-center">
          <p class="text-xs uppercase tracking-[0.3em] text-indigo-300/70">${t.eyebrow}</p>
          <h1 class="mt-2 text-3xl sm:text-4xl font-semibold text-white">${t.title}</h1>
          <p class="mt-2 text-sm text-zinc-400">${t.subtitle}</p>
        </header>

        <section class="rounded-2xl border border-white/10 bg-white/4 backdrop-blur p-5 sm:p-6 shadow-2xl shadow-indigo-950/30">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <label class="block">
              <span class="block text-xs font-medium text-zinc-400 mb-1.5">${t.provider}</span>
              <select id="sel-provider" class="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/60">
                ${optionsHtml(PROVIDERS, state.provider)}
              </select>
            </label>
            <label class="block">
              <span class="block text-xs font-medium text-zinc-400 mb-1.5">${t.lang}</span>
              <select id="sel-lang" class="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/60">
                ${optionsHtml(LANGS, state.lang)}
              </select>
            </label>
            <label class="block col-span-2 sm:col-span-1">
              <span class="block text-xs font-medium text-zinc-400 mb-1.5">${t.voice}</span>
              <select id="sel-voice" class="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/60">
                ${optionsHtml(VOICES[state.provider], state.voice)}
              </select>
            </label>
            <label class="block col-span-2 sm:col-span-1">
              <span class="block text-xs font-medium text-zinc-400 mb-1.5">${t.mood}</span>
              <select id="sel-mood" class="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/60">
                ${optionsHtml(MOODS[state.lang], state.mood)}
              </select>
            </label>
          </div>

          <label for="txt" class="block text-xs font-medium text-zinc-400 mb-2">${t.matn}</label>
          <textarea
            id="txt"
            rows="4"
            maxlength="1000"
            class="w-full resize-none rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-transparent"
            placeholder="${t.placeholder}"
          ></textarea>

          <div class="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span id="count">0 / 1000</span>
            <button id="sample" type="button" class="hover:text-zinc-300 transition">${t.sample}</button>
          </div>

          <div class="mt-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <button
              id="play"
              class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 disabled:bg-zinc-700 disabled:text-zinc-400 px-5 py-3 font-medium text-white transition shadow-lg shadow-indigo-900/40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                <path d="M6.3 3.7a1 1 0 0 0-1.5.87v10.86a1 1 0 0 0 1.5.87l9.4-5.43a1 1 0 0 0 0-1.74L6.3 3.7Z"/>
              </svg>
              <span id="play-label">${t.play}</span>
            </button>
            <audio id="player" controls class="flex-1 w-full rounded-xl"></audio>
          </div>

          <div id="status" class="mt-4 text-xs text-zinc-400 min-h-5"></div>
        </section>

        <footer class="mt-6 text-center text-[11px] text-zinc-600">${t.footer}</footer>
      </div>
    </main>
  `;
  bind();
}

let lastUrl = "";
let lastTextValue = "";

function bind() {
  const t = UI[state.lang];
  const $txt = document.getElementById("txt") as HTMLTextAreaElement;
  const $count = document.getElementById("count") as HTMLSpanElement;
  const $sample = document.getElementById("sample") as HTMLButtonElement;
  const $play = document.getElementById("play") as HTMLButtonElement;
  const $playLabel = document.getElementById("play-label") as HTMLSpanElement;
  const $player = document.getElementById("player") as HTMLAudioElement;
  const $status = document.getElementById("status") as HTMLDivElement;
  const $selProvider = document.getElementById("sel-provider") as HTMLSelectElement;
  const $selLang = document.getElementById("sel-lang") as HTMLSelectElement;
  const $selVoice = document.getElementById("sel-voice") as HTMLSelectElement;
  const $selMood = document.getElementById("sel-mood") as HTMLSelectElement;

  $txt.value = lastTextValue;
  const updateCount = () => {
    $count.textContent = `${$txt.value.length} / 1000`;
  };
  $txt.addEventListener("input", () => {
    lastTextValue = $txt.value;
    updateCount();
  });
  updateCount();

  $sample.addEventListener("click", () => {
    $txt.value = SAMPLES[state.lang];
    lastTextValue = $txt.value;
    updateCount();
    $txt.focus();
  });

  $selProvider.addEventListener("change", () => {
    state.provider = $selProvider.value as ProviderId;
    state.voice = DEFAULT_VOICE[state.provider];
    render();
  });
  $selLang.addEventListener("change", () => {
    state.lang = $selLang.value as LangId;
    render();
  });
  $selVoice.addEventListener("change", () => {
    state.voice = $selVoice.value;
  });
  $selMood.addEventListener("change", () => {
    state.mood = $selMood.value as MoodId;
  });

  const setStatus = (msg: string, tone: "idle" | "info" | "error" = "idle") => {
    $status.textContent = msg;
    $status.className =
      "mt-4 text-xs min-h-5 " +
      (tone === "error"
        ? "text-rose-400"
        : tone === "info"
          ? "text-indigo-300"
          : "text-zinc-400");
  };

  const setBusy = (busy: boolean) => {
    $play.disabled = busy;
    $playLabel.textContent = busy ? t.busy : t.play;
  };

  $play.addEventListener("click", () => {
    const text = $txt.value.trim();
    if (!text) {
      setStatus(t.empty, "error");
      return;
    }
    const params = new URLSearchParams({
      text,
      provider: state.provider,
      lang: state.lang,
      voice: state.voice,
      mood: state.mood,
    });
    const url = `${API_BASE}/api/tts?${params.toString()}`;
    lastUrl = url;
    setBusy(true);
    setStatus(t.starting, "info");
    $player.src = url;
    $player.play().catch((err) => {
      console.error(err);
      setStatus(t.autoplayFail, "error");
      setBusy(false);
    });
  });

  $player.addEventListener("playing", () => {
    setBusy(false);
    setStatus(t.playing, "info");
  });
  $player.addEventListener("ended", () => setStatus(t.ended, "idle"));
  $player.addEventListener("error", () => {
    setBusy(false);
    if ($player.src && $player.src === lastUrl) setStatus(t.loadFail, "error");
  });
}

async function loadOptions() {
  try {
    const resp = await fetch(`${API_BASE}/api/tts/options`);
    if (!resp.ok) return;
    const data = await resp.json();
    if (data?.voices?.gemini && data?.voices?.elevenlabs) {
      VOICES = data.voices;
    }
    if (data?.defaultVoice) DEFAULT_VOICE = data.defaultVoice;
    ensureVoiceValid();
    render();
  } catch {
    /* keep fallback voices */
  }
}

render();
loadOptions();
