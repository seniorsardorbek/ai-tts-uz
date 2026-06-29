import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { CacheItem, Gender, LessonSummary } from "@ai-tts/shared";
import { NO_LESSON } from "@ai-tts/shared";
import {
  cacheAudioUrl,
  commitRegenerate,
  deleteCache,
  discardPreview,
  fetchLessons,
  fetchLessonSpeeches,
  previewAudioUrl,
  regeneratePreview,
} from "../api";
import { logout } from "../auth";

type SortKey = "date" | "size";

const fmtSize = (b: number) => `${(b / 1024).toFixed(1)} KB`;
const fmtDate = (iso: string) => new Date(iso).toLocaleString();

/* ---------- regenerate (replace) a slot's audio, keep key + displayed text ---------- */
function RegenerateModal({
  item,
  onClose,
  onCommitted,
}: {
  item: CacheItem;
  onClose: () => void;
  onCommitted: (key: string) => void;
}) {
  const [prompt, setPrompt] = useState(item.text ?? "");
  const [voiceGender, setVoiceGender] = useState<Gender>(item.gender);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"" | "preview" | "commit">("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    if (previewUrl) discardPreview(item.gender, item.key); // best-effort cleanup
    onClose();
  };

  const doPreview = async () => {
    if (!prompt.trim()) return;
    setBusy("preview");
    setError(null);
    try {
      await regeneratePreview(item.gender, item.key, prompt, voiceGender);
      setPreviewUrl(previewAudioUrl(item.gender, item.key)); // ?t= cache-bust
    } catch (e) {
      setError(String((e as Error).message || e));
    } finally {
      setBusy("");
    }
  };

  const doCommit = async () => {
    setBusy("commit");
    setError(null);
    try {
      await commitRegenerate(item.gender, item.key);
      onCommitted(item.key);
      onClose();
    } catch (e) {
      setError(String((e as Error).message || e));
      setBusy("");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={close}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">Ovozni qayta yaratish</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Bu slot ({item.gender === "f" ? "Ayol" : "Erkak"}) bir xil kalit bilan saqlanadi — ko'rsatiladigan matn
          o'zgarmaydi. Faqat eshitiriladigan audio almashtiriladi.
        </p>
        <p className="mt-2 text-[11px] text-amber-300/90">
          ⚠️ Matn va ovoz bir-biriga mos kelmasligi mumkin.
        </p>

        <label className="mt-4 block text-xs font-medium text-zinc-400 mb-2">Prompt matn (generatsiya uchun)</label>
        <textarea
          rows={4}
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            setPreviewUrl(null); // text changed -> old preview is stale
          }}
          maxLength={1000}
          className="w-full resize-none rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
        />

        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs font-medium text-zinc-400">Ovoz</span>
          <div className="inline-flex rounded-lg border border-white/10 bg-black/30 p-1">
            {(["f", "m"] as Gender[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setVoiceGender(g);
                  setPreviewUrl(null);
                }}
                className={`px-3 py-1 text-xs rounded-md transition ${
                  voiceGender === g ? "bg-indigo-500 text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {g === "f" ? "Jessica · ayol" : "Liam · erkak"}
              </button>
            ))}
          </div>
        </div>

        {previewUrl && (
          <div className="mt-4">
            <p className="text-xs text-zinc-400 mb-1.5">Eshitib ko'ring:</p>
            <audio controls autoPlay src={previewUrl} className="w-full h-9" />
          </div>
        )}

        {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={close}
            disabled={!!busy}
            className="px-3 py-2 rounded-lg border border-white/10 text-zinc-300 text-sm hover:bg-white/5 disabled:opacity-50"
          >
            Bekor
          </button>
          <button
            onClick={doPreview}
            disabled={!!busy || !prompt.trim()}
            className="px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {busy === "preview" ? "Yaratilmoqda…" : previewUrl ? "Qayta yaratish" : "Eshitish (preview)"}
          </button>
          <button
            onClick={doCommit}
            disabled={!!busy || !previewUrl}
            className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {busy === "commit" ? "Saqlanmoqda…" : "Saqlash"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- speeches table (reused inside a lesson) ---------- */
function SpeechTable({ items, onDeleted }: { items: CacheItem[]; onDeleted: (key: string) => void }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [playing, setPlaying] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [regen, setRegen] = useState<CacheItem | null>(null);
  const [bust, setBust] = useState<Record<string, number>>({});

  // After a commit the live mp3 is overwritten — bust the 1h browser cache.
  const liveSrc = (it: CacheItem) =>
    bust[it.key] ? `${cacheAudioUrl(it.gender, it.key)}?t=${bust[it.key]}` : cacheAudioUrl(it.gender, it.key);

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
                      src={liveSrc(it)}
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
                    onClick={() => setRegen(it)}
                    className="px-2.5 py-1 rounded-lg border border-indigo-900 text-indigo-300 hover:bg-indigo-500/10 text-xs mr-2"
                  >
                    ♻️ Qayta yaratish
                  </button>
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

      {regen && (
        <RegenerateModal
          item={regen}
          onClose={() => setRegen(null)}
          onCommitted={(key) => {
            setBust((b) => ({ ...b, [key]: Date.now() }));
            setPlaying((p) => (p === key ? null : p)); // drop stale player so next play is fresh
          }}
        />
      )}
    </>
  );
}

/* ---------- page: lessons list <-> a lesson's speeches ---------- */
export default function CachePage() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

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
            <button onClick={signOut} className="text-xs text-zinc-500 hover:text-zinc-300">
              Chiqish
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
