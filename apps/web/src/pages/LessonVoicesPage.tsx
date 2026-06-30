import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import type { CacheItem } from "@ai-tts/shared";
import { NO_LESSON } from "@ai-tts/shared";
import { fetchLessons, fetchLessonSpeeches } from "../api";
import VoiceCard from "../components/VoiceCard";
import RegenerateModal from "../components/RegenerateModal";

type SortKey = "date" | "size";

export default function LessonVoicesPage() {
  const { lessonId = NO_LESSON } = useParams();
  const isNone = lessonId === NO_LESSON;
  const stateName = (useLocation().state as { lessonName?: string | null } | null)?.lessonName ?? null;

  const [name, setName] = useState<string | null>(stateName);
  const [items, setItems] = useState<CacheItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
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
    const f = q ? items.filter((i) => (i.text ?? "").toLowerCase().includes(q) || i.key.includes(q)) : items;
    return [...f].sort((a, b) =>
      sort === "size" ? b.sizeBytes - a.sizeBytes : a.createdAt < b.createdAt ? 1 : -1,
    );
  }, [items, query, sort]);

  const regenKey = searchParams.get("regen");
  const regenItem = regenKey ? items.find((i) => i.key === regenKey) ?? null : null;
  const openRegen = (it: CacheItem) => setSearchParams({ regen: it.key });
  const closeRegen = () => setSearchParams({});

  return (
    <div>
      <header className="mb-6">
        <Link to="/cache" className="text-xs text-indigo-300 hover:text-indigo-200">
          ← Darslar
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-white break-words">{title}</h1>
        <p className="mt-0.5 text-sm text-zinc-400">
          {!isNone && <span className="font-mono">{lessonId} · </span>}
          {items.length} ta ovoz
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
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

      {loading ? (
        <p className="text-zinc-500">Yuklanmoqda…</p>
      ) : error ? (
        <p className="text-rose-400">Xato: {error}</p>
      ) : view.length === 0 ? (
        <p className="text-zinc-500">{items.length === 0 ? "Bu darsda ovoz yo'q." : "Qidiruvga mos ovoz topilmadi."}</p>
      ) : (
        <div className="space-y-3">
          {view.map((it) => (
            <VoiceCard
              key={it.key}
              item={it}
              bust={bust[it.key]}
              onRegenerate={openRegen}
              onDeleted={(key) => setItems((p) => p.filter((x) => x.key !== key))}
            />
          ))}
        </div>
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
