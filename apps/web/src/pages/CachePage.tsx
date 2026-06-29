import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CacheItem, LessonSummary } from "@ai-tts/shared";
import { NO_LESSON } from "@ai-tts/shared";
import { cacheAudioUrl, deleteCache, fetchLessons, fetchLessonSpeeches } from "../api";

type SortKey = "date" | "size";

const fmtSize = (b: number) => `${(b / 1024).toFixed(1)} KB`;
const fmtDate = (iso: string) => new Date(iso).toLocaleString();

/* ---------- speeches table (reused inside a lesson) ---------- */
function SpeechTable({ items, onDeleted }: { items: CacheItem[]; onDeleted: (key: string) => void }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [playing, setPlaying] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const view = useMemo(() => {
    const q = query.trim().toLowerCase();
    const f = q ? items.filter((i) => (i.text ?? "").toLowerCase().includes(q) || i.key.includes(q)) : items;
    return [...f].sort((a, b) =>
      sort === "size" ? b.sizeBytes - a.sizeBytes : a.createdAt < b.createdAt ? 1 : -1,
    );
  }, [items, query, sort]);

  const remove = async (it: CacheItem) => {
    if (!window.confirm(`O'chirilsinmi?\n\n"${it.text ?? it.key}"`)) return;
    setDeleting(it.key);
    try {
      await deleteCache(it.gender, it.key);
      onDeleted(it.key);
      if (playing === it.key) setPlaying(null);
    } catch (e) {
      alert(`O'chirib bo'lmadi: ${(e as Error).message || e}`);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Matn yoki hash bo'yicha qidirish…"
          className="flex-1 rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-zinc-100"
        >
          <option value="date">Yangi → eski</option>
          <option value="size">Hajm (katta → kichik)</option>
        </select>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 text-zinc-400 text-xs">
              <th className="px-4 py-2.5 text-left font-medium">Ovoz</th>
              <th className="px-4 py-2.5 text-left font-medium">Matn</th>
              <th className="px-4 py-2.5 text-left font-medium">Yaratilgan</th>
              <th className="px-4 py-2.5 text-right font-medium">Hajm</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="text-zinc-100">
            {view.map((it) => (
              <tr key={it.key} className="border-b border-white/5">
                <td className="px-4 py-2.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      it.gender === "f" ? "bg-fuchsia-500/20 text-fuchsia-200" : "bg-sky-500/20 text-sky-200"
                    }`}
                  >
                    {it.gender === "f" ? "Ayol" : "Erkak"}
                  </span>
                </td>
                <td className="px-4 py-2.5 max-w-[380px] truncate">
                  {it.text ? (
                    <span title={it.text}>{it.text}</span>
                  ) : (
                    <span className="text-zinc-600 italic" title={it.key}>— (eski, matn yo'q)</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-zinc-400 whitespace-nowrap">{fmtDate(it.createdAt)}</td>
                <td className="px-4 py-2.5 text-zinc-400 text-right whitespace-nowrap">{fmtSize(it.sizeBytes)}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {playing === it.key ? (
                    <audio
                      autoPlay
                      controls
                      className="h-8 align-middle inline-block max-w-[220px]"
                      src={cacheAudioUrl(it.gender, it.key)}
                      onEnded={() => setPlaying(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setPlaying(it.key)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs mr-2"
                    >
                      ▶ Eshitish
                    </button>
                  )}
                  <button
                    onClick={() => remove(it)}
                    disabled={deleting === it.key}
                    className="px-2.5 py-1 rounded-lg border border-rose-900 text-rose-300 hover:bg-rose-500/10 text-xs"
                  >
                    {deleting === it.key ? "…" : "🗑 O'chirish"}
                  </button>
                </td>
              </tr>
            ))}
            {view.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-zinc-500">Bu darsda ovoz topilmadi.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- page: lessons list <-> a lesson's speeches ---------- */
export default function CachePage() {
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<LessonSummary | null>(null);
  const [speeches, setSpeeches] = useState<CacheItem[]>([]);
  const [spLoading, setSpLoading] = useState(false);

  const loadLessons = async () => {
    setLoading(true);
    setError(null);
    try {
      setLessons(await fetchLessons());
    } catch (e) {
      setError(String((e as Error).message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLessons();
  }, []);

  const openLesson = async (l: LessonSummary) => {
    setSelected(l);
    setSpLoading(true);
    setSpeeches([]);
    try {
      const d = await fetchLessonSpeeches(l.lessonId ?? NO_LESSON);
      setSpeeches(d.items);
    } catch (e) {
      alert(`Yuklab bo'lmadi: ${(e as Error).message || e}`);
    } finally {
      setSpLoading(false);
    }
  };

  const lessonTitle = (l: LessonSummary) =>
    l.lessonId === null ? "Darssiz (TTS tarix)" : l.lessonName || l.lessonId;

  /* ---- a lesson's speeches ---- */
  if (selected) {
    return (
      <main className="min-h-full px-4 py-8">
        <div className="w-full max-w-5xl mx-auto">
          <header className="mb-5">
            <button onClick={() => setSelected(null)} className="text-xs text-indigo-300 hover:text-indigo-200">
              ← Darslar
            </button>
            <h1 className="text-2xl font-semibold text-white mt-1">{lessonTitle(selected)}</h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              {selected.lessonId === null ? "" : `lesson_id: ${selected.lessonId} · `}
              {speeches.length} ta ovoz
            </p>
          </header>
          {spLoading ? <p className="text-zinc-500">Yuklanmoqda…</p> : (
            <SpeechTable items={speeches} onDeleted={(key) => setSpeeches((p) => p.filter((x) => x.key !== key))} />
          )}
        </div>
      </main>
    );
  }

  /* ---- lessons list ---- */
  return (
    <main className="min-h-full px-4 py-8">
      <div className="w-full max-w-3xl mx-auto">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Darslar</h1>
            <p className="text-sm text-zinc-400 mt-0.5">{lessons.length} ta dars · TTS tarixidan</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xs text-indigo-300 hover:text-indigo-200">← TTS</Link>
            <button onClick={loadLessons} className="px-3 py-1.5 rounded-lg border border-white/10 text-zinc-300 text-sm hover:bg-white/5">
              ↻ Yangilash
            </button>
          </div>
        </header>

        {loading ? (
          <p className="text-zinc-500">Yuklanmoqda…</p>
        ) : error ? (
          <p className="text-rose-400">Xato: {error}</p>
        ) : lessons.length === 0 ? (
          <p className="text-zinc-500">Hali dars yo'q.</p>
        ) : (
          <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
            {lessons.map((l) => (
              <button
                key={l.lessonId ?? "__none__"}
                onClick={() => openLesson(l)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-white/5 transition"
              >
                <div className="min-w-0">
                  <div className={`text-sm font-medium truncate ${l.lessonId === null ? "text-zinc-400 italic" : "text-zinc-100"}`}>
                    {lessonTitle(l)}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {l.lessonId !== null && <span className="mr-2">{l.lessonId}</span>}
                    so'nggi: {fmtDate(l.lastUsed)}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs whitespace-nowrap pl-3">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-200">{l.speechCount} ovoz</span>
                  <span className="text-zinc-500">{l.requestCount} so'rov</span>
                  <span className="text-zinc-600">›</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
