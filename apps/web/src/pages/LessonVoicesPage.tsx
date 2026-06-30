import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { CacheItem } from "@ai-tts/shared";
import { NO_LESSON } from "@ai-tts/shared";
import { deleteLesson, fetchLessons, fetchLessonSpeeches } from "../api";
import VoiceCard from "../components/VoiceCard";
import RegenerateModal from "../components/RegenerateModal";

type SortKey = "date" | "size";
const PAGE_SIZE = 20;

export default function LessonVoicesPage() {
  const { lessonId = NO_LESSON } = useParams();
  const isNone = lessonId === NO_LESSON;
  const stateName = (useLocation().state as { lessonName?: string | null } | null)?.lessonName ?? null;
  const navigate = useNavigate();

  const [name, setName] = useState<string | null>(stateName);
  const [items, setItems] = useState<CacheItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [from, setFrom] = useState(""); // datetime-local
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [deletingAll, setDeletingAll] = useState(false);
  const [bust, setBust] = useState<Record<string, number>>({});
  const [searchParams, setSearchParams] = useSearchParams();

  // Load this lesson's speeches.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchLessonSpeeches(lessonId)
      .then((d) => alive && setItems(d.items))
      .catch((e) => alive && setError(String((e as Error).message || e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [lessonId]);

  // Resolve the lesson name if we arrived via deep-link / refresh (no router state).
  useEffect(() => {
    if (isNone || name) return;
    let alive = true;
    fetchLessons()
      .then((ls) => {
        const found = ls.find((l) => l.lessonId === lessonId);
        if (alive && found) setName(found.lessonName ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isNone, name, lessonId]);

  const title = isNone ? "Darssiz (TTS tarix)" : name || lessonId;

  const view = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(to).getTime() : null;
    const f = items.filter((i) => {
      if (q && !(i.text ?? "").toLowerCase().includes(q) && !i.key.includes(q)) return false;
      const t = new Date(i.createdAt).getTime();
      if (fromTs !== null && t < fromTs) return false;
      if (toTs !== null && t > toTs) return false;
      return true;
    });
    return f.sort((a, b) => (sort === "size" ? b.sizeBytes - a.sizeBytes : a.createdAt < b.createdAt ? 1 : -1));
  }, [items, query, sort, from, to]);

  // Reset to page 1 whenever the filtered set changes.
  useEffect(() => setPage(1), [query, sort, from, to, items.length]);

  const pageCount = Math.max(1, Math.ceil(view.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = view.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const regenKey = searchParams.get("regen");
  const regenItem = regenKey ? items.find((i) => i.key === regenKey) ?? null : null;
  const openRegen = (it: CacheItem) => setSearchParams({ regen: it.key });
  const closeRegen = () => setSearchParams({});

  const removeLesson = async () => {
    if (!window.confirm(`Bu darsdagi ${items.length} ta ovoz va shu lesson tarixi butunlay o'chiriladi. Davom etilsinmi?`))
      return;
    setDeletingAll(true);
    try {
      await deleteLesson(lessonId);
      navigate("/cache", { replace: true });
    } catch (e) {
      alert(`O'chirib bo'lmadi: ${(e as Error).message || e}`);
      setDeletingAll(false);
    }
  };

  const clearDates = () => {
    setFrom("");
    setTo("");
  };

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/cache" className="text-xs text-indigo-300 hover:text-indigo-200">
            ← Darslar
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-white break-words">{title}</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            {!isNone && <span className="font-mono">{lessonId} · </span>}
            {items.length} ta ovoz
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={removeLesson}
            disabled={deletingAll}
            className="shrink-0 rounded-lg border border-rose-500/30 px-3 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
          >
            {deletingAll ? "O'chirilmoqda…" : "🗑 Barcha ovozlarni o'chirish"}
          </button>
        )}
      </header>

      {/* filters */}
      <div className="mb-5 space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Matn yoki hash bo'yicha qidirish…"
            className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="date">Yangi → eski</option>
            <option value="size">Hajm (katta → kichik)</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <span>Sana:</span>
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-zinc-100 [color-scheme:dark]"
          />
          <span>—</span>
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-zinc-100 [color-scheme:dark]"
          />
          {(from || to) && (
            <button onClick={clearDates} className="text-indigo-300 hover:text-indigo-200">
              Tozalash
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-zinc-500">Yuklanmoqda…</p>
      ) : error ? (
        <p className="text-rose-400">Xato: {error}</p>
      ) : view.length === 0 ? (
        <p className="text-zinc-500">
          {items.length === 0 ? "Bu darsda ovoz yo'q." : "Filtr/qidiruvga mos ovoz topilmadi."}
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-zinc-500">
            {view.length} ta natija
            {view.length > PAGE_SIZE && ` · ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, view.length)}`}
          </p>
          <div className="space-y-3">
            {pageItems.map((it) => (
              <VoiceCard
                key={it.key}
                item={it}
                bust={bust[it.key]}
                onRegenerate={openRegen}
                onDeleted={(key) => setItems((p) => p.filter((x) => x.key !== key))}
              />
            ))}
          </div>

          {pageCount > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3 text-sm">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-300 hover:bg-white/5 disabled:opacity-40"
              >
                ‹ Oldingi
              </button>
              <span className="text-zinc-400">
                sahifa {safePage} / {pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={safePage >= pageCount}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-300 hover:bg-white/5 disabled:opacity-40"
              >
                Keyingi ›
              </button>
            </div>
          )}
        </>
      )}

      {regenItem && (
        <RegenerateModal
          item={regenItem}
          onClose={closeRegen}
          onCommitted={(key) => setBust((b) => ({ ...b, [key]: Date.now() }))}
        />
      )}
    </div>
  );
}
