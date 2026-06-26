import "./style.css";

// Same base as the TTS page (built with VITE_API_BASE). Served same-origin via
// the CRM proxy, so the relative-ish base resolves to .../ms/lesson-runner/api/...
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

type Item = {
  key: string;
  gender: "m" | "f";
  text: string | null;
  createdAt: string;
  sizeBytes: number;
};

const state = {
  items: [] as Item[],
  totalBytes: 0,
  query: "",
  sort: "date" as "date" | "size",
  playing: null as string | null,
  loading: true,
  error: null as string | null,
};

const fmtSize = (b: number) => `${(b / 1024).toFixed(1)} KB`;
const fmtTotal = (b: number) =>
  b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;
const fmtDate = (iso: string) => new Date(iso).toLocaleString();
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const root = document.getElementById("app")!;

function visibleItems(): Item[] {
  const q = state.query.trim().toLowerCase();
  const filtered = q
    ? state.items.filter((i) => (i.text ?? "").toLowerCase().includes(q) || i.key.includes(q))
    : state.items;
  return [...filtered].sort((a, b) =>
    state.sort === "size" ? b.sizeBytes - a.sizeBytes : a.createdAt < b.createdAt ? 1 : -1,
  );
}

function rowsHtml(): string {
  if (state.loading) return `<tr><td colspan="5" class="px-4 py-6 text-zinc-500">Yuklanmoqda…</td></tr>`;
  if (state.error)
    return `<tr><td colspan="5" class="px-4 py-6 text-rose-400">Xato: ${esc(state.error)}</td></tr>`;
  const items = visibleItems();
  if (!items.length) return `<tr><td colspan="5" class="px-4 py-6 text-zinc-500">Hech narsa topilmadi.</td></tr>`;
  return items
    .map((i) => {
      const badge =
        i.gender === "f"
          ? `<span class="px-2 py-0.5 rounded-full text-xs bg-fuchsia-500/20 text-fuchsia-200">Ayol</span>`
          : `<span class="px-2 py-0.5 rounded-full text-xs bg-sky-500/20 text-sky-200">Erkak</span>`;
      const text = i.text
        ? `<span title="${esc(i.text)}">${esc(i.text)}</span>`
        : `<span class="text-zinc-600 italic">— (eski, matn yo'q)</span>`;
      const action =
        state.playing === i.key
          ? `<audio autoplay controls class="h-8 align-middle inline-block max-w-[220px]" src="${API_BASE}/api/cache/${i.gender}/${i.key}/audio" data-ended="${i.key}"></audio>`
          : `<button data-action="play" data-key="${i.key}" class="px-2.5 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs mr-2">▶ Eshitish</button>`;
      return `<tr class="border-b border-white/5" data-row="${i.key}">
        <td class="px-4 py-2.5">${badge}</td>
        <td class="px-4 py-2.5 max-w-[380px] truncate">${text}</td>
        <td class="px-4 py-2.5 text-zinc-400 whitespace-nowrap">${fmtDate(i.createdAt)}</td>
        <td class="px-4 py-2.5 text-zinc-400 text-right whitespace-nowrap">${fmtSize(i.sizeBytes)}</td>
        <td class="px-4 py-2.5 whitespace-nowrap">${action}
          <button data-action="del" data-key="${i.key}" data-gender="${i.gender}" class="px-2.5 py-1 rounded-lg border border-rose-900 text-rose-300 hover:bg-rose-500/10 text-xs">🗑 O'chirish</button>
        </td>
      </tr>`;
    })
    .join("");
}

function updateMeta() {
  const m = document.getElementById("meta");
  if (m) m.textContent = `${visibleItems().length}/${state.items.length} ta · ${fmtTotal(state.totalBytes)}`;
}

function renderRows() {
  const tb = document.getElementById("rows");
  if (tb) tb.innerHTML = rowsHtml();
  updateMeta();
}

function renderShell() {
  root.innerHTML = /* html */ `
    <main class="min-h-full px-4 py-8">
      <div class="w-full max-w-5xl mx-auto">
        <header class="mb-5 flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-semibold text-white">TTS cache</h1>
            <p id="meta" class="text-sm text-zinc-400 mt-0.5"></p>
          </div>
          <button id="refresh" class="px-3 py-1.5 rounded-lg border border-white/10 text-zinc-300 text-sm hover:bg-white/5">↻ Yangilash</button>
        </header>

        <div class="flex gap-2 mb-4">
          <input id="search" placeholder="Matn yoki hash bo'yicha qidirish…"
            class="flex-1 rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400/60" />
          <select id="sort" class="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-zinc-100">
            <option value="date">Yangi → eski</option>
            <option value="size">Hajm (katta → kichik)</option>
          </select>
        </div>

        <div class="rounded-xl border border-white/10 overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-white/5 text-zinc-400 text-xs">
                <th class="px-4 py-2.5 text-left font-medium">Ovoz</th>
                <th class="px-4 py-2.5 text-left font-medium">Matn</th>
                <th class="px-4 py-2.5 text-left font-medium">Yaratilgan</th>
                <th class="px-4 py-2.5 text-right font-medium">Hajm</th>
                <th class="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody id="rows" class="text-zinc-100">${rowsHtml()}</tbody>
          </table>
        </div>
      </div>
    </main>`;

  (document.getElementById("search") as HTMLInputElement).addEventListener("input", (e) => {
    state.query = (e.target as HTMLInputElement).value;
    renderRows();
  });
  (document.getElementById("sort") as HTMLSelectElement).addEventListener("change", (e) => {
    state.sort = (e.target as HTMLSelectElement).value as "date" | "size";
    renderRows();
  });
  document.getElementById("refresh")!.addEventListener("click", load);

  document.getElementById("rows")!.addEventListener("click", async (e) => {
    const btn = (e.target as HTMLElement).closest("button[data-action]") as HTMLButtonElement | null;
    if (!btn) return;
    const key = btn.dataset.key!;
    if (btn.dataset.action === "play") {
      state.playing = key;
      renderRows();
    } else if (btn.dataset.action === "del") {
      const item = state.items.find((i) => i.key === key);
      if (!item) return;
      if (!confirm(`O'chirilsinmi?\n\n"${item.text ?? key}"`)) return;
      btn.disabled = true;
      btn.textContent = "…";
      try {
        const res = await fetch(`${API_BASE}/api/cache/${item.gender}/${key}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        state.items = state.items.filter((i) => i.key !== key);
        if (state.playing === key) state.playing = null;
        renderRows();
      } catch (err) {
        alert(`O'chirib bo'lmadi: ${(err as Error).message || err}`);
        btn.disabled = false;
        btn.textContent = "🗑 O'chirish";
      }
    }
  });
  document.getElementById("rows")!.addEventListener("ended", (e) => {
    const a = e.target as HTMLAudioElement;
    if (a.dataset?.ended && state.playing === a.dataset.ended) {
      state.playing = null;
      renderRows();
    }
  }, true);
}

async function load() {
  state.loading = true;
  state.error = null;
  renderRows();
  try {
    const res = await fetch(`${API_BASE}/api/cache`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.items = data.items ?? [];
    state.totalBytes = data.totalBytes ?? 0;
  } catch (e) {
    state.error = String((e as Error).message || e);
  } finally {
    state.loading = false;
    renderRows();
  }
}

renderShell();
load();
