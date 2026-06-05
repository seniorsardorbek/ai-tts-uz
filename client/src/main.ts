import "./style.css";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";

type Gender = "m" | "f";

const SAMPLE =
  "Madinada ikkita olma bor edi lekin Sardor bittasini tortib oldi, Madinada nechta olma qoldi";

const state: { gender: Gender } = { gender: "f" };

const root = document.getElementById("app")!;
root.innerHTML = /* html */ `
  <main class="min-h-full flex items-center justify-center px-4 py-10">
    <div class="w-full max-w-2xl">
      <header class="mb-6 text-center">
        <p class="text-xs uppercase tracking-[0.3em] text-indigo-300/70">ElevenLabs v3 · Stream</p>
        <h1 class="mt-2 text-3xl sm:text-4xl font-semibold text-white">Ovozli o'qib berish</h1>
        <p class="mt-2 text-sm text-zinc-400">Gap yozing, jinsi tanlang — ovoz darhol oqim qilib eshitiladi.</p>
      </header>

      <section class="rounded-2xl border border-white/10 bg-white/4 backdrop-blur p-5 sm:p-6 shadow-2xl shadow-indigo-950/30">
        <div class="mb-4 flex items-center justify-between">
          <span class="text-xs font-medium text-zinc-400">Ovoz</span>
          <div role="tablist" class="inline-flex rounded-xl border border-white/10 bg-black/30 p-1">
            <button
              id="g-f"
              role="tab"
              type="button"
              class="px-4 py-1.5 text-sm rounded-lg transition bg-indigo-500 text-white"
            >Jessica · ayol</button>
            <button
              id="g-m"
              role="tab"
              type="button"
              class="px-4 py-1.5 text-sm rounded-lg transition text-zinc-400 hover:text-zinc-200"
            >Liam · erkak</button>
          </div>
        </div>

        <label for="txt" class="block text-xs font-medium text-zinc-400 mb-2">Matn</label>
        <textarea
          id="txt"
          rows="5"
          maxlength="1000"
          class="w-full resize-none rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-transparent"
          placeholder="Bu yerga gap yozing…"
        ></textarea>

        <div class="mt-3 flex items-center justify-between text-xs text-zinc-500">
          <span id="count">0 / 1000</span>
          <button id="sample" type="button" class="hover:text-zinc-300 transition">Namuna gap qo'yish</button>
        </div>

        <div class="mt-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <button
            id="play"
            class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 disabled:bg-zinc-700 disabled:text-zinc-400 px-5 py-3 font-medium text-white transition shadow-lg shadow-indigo-900/40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
              <path d="M6.3 3.7a1 1 0 0 0-1.5.87v10.86a1 1 0 0 0 1.5.87l9.4-5.43a1 1 0 0 0 0-1.74L6.3 3.7Z"/>
            </svg>
            <span id="play-label">Eshitish</span>
          </button>
          <audio id="player" controls class="flex-1 w-full rounded-xl"></audio>
        </div>

        <div id="status" class="mt-4 text-xs text-zinc-400 min-h-5"></div>
      </section>

      <footer class="mt-6 text-center text-[11px] text-zinc-600">
        Multilingual auto-detect · bir xil matn ikkinchi marta → cache'dan
      </footer>
    </div>
  </main>
`;

const $txt = document.getElementById("txt") as HTMLTextAreaElement;
const $count = document.getElementById("count") as HTMLSpanElement;
const $sample = document.getElementById("sample") as HTMLButtonElement;
const $play = document.getElementById("play") as HTMLButtonElement;
const $playLabel = document.getElementById("play-label") as HTMLSpanElement;
const $player = document.getElementById("player") as HTMLAudioElement;
const $status = document.getElementById("status") as HTMLDivElement;
const $gf = document.getElementById("g-f") as HTMLButtonElement;
const $gm = document.getElementById("g-m") as HTMLButtonElement;

const ACTIVE_CLASS = "bg-indigo-500 text-white";
const INACTIVE_CLASS = "text-zinc-400 hover:text-zinc-200";
const BASE_TOGGLE = "px-4 py-1.5 text-sm rounded-lg transition";

const setGender = (g: Gender) => {
  state.gender = g;
  $gf.className = `${BASE_TOGGLE} ${g === "f" ? ACTIVE_CLASS : INACTIVE_CLASS}`;
  $gm.className = `${BASE_TOGGLE} ${g === "m" ? ACTIVE_CLASS : INACTIVE_CLASS}`;
};
$gf.addEventListener("click", () => setGender("f"));
$gm.addEventListener("click", () => setGender("m"));

const updateCount = () => {
  $count.textContent = `${$txt.value.length} / 1000`;
};
$txt.addEventListener("input", updateCount);
$sample.addEventListener("click", () => {
  $txt.value = SAMPLE;
  updateCount();
  $txt.focus();
});
updateCount();

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
  $playLabel.textContent = busy ? "Yuklanmoqda…" : "Eshitish";
};

let lastUrl = "";

$play.addEventListener("click", () => {
  const text = $txt.value.trim();
  if (!text) {
    setStatus("Matn kiriting.", "error");
    return;
  }
  const params = new URLSearchParams({ text, g: state.gender });
  const url = `${API_BASE}/api/tts?${params}`;
  lastUrl = url;
  setBusy(true);
  setStatus("Oqim boshlanmoqda…", "info");
  $player.src = url;
  $player.play().catch((err) => {
    console.error(err);
    setStatus("Avtomatik ijro ishlamadi — pleerda Play tugmasini bosing.", "error");
    setBusy(false);
  });
});

$player.addEventListener("playing", () => {
  setBusy(false);
  setStatus("Eshitilmoqda…", "info");
});
$player.addEventListener("ended", () => setStatus("Tugadi.", "idle"));
$player.addEventListener("error", () => {
  setBusy(false);
  if ($player.src && $player.src === lastUrl) {
    setStatus("Audio yuklab bo'lmadi. Server va kalit tekshiring.", "error");
  }
});
