import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LessonSummary } from "@ai-tts/shared";
import { NO_LESSON } from "@ai-tts/shared";
import { fetchLessons } from "../api";
import { fmtDate } from "../lib/format";

export default function LessonsPage() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
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
    load();
  }, []);

  const title = (l: LessonSummary) => (l.lessonId === null ? "Darssiz (TTS tarix)" : l.lessonName || l.lessonId);

  const open = (l: LessonSummary) =>
    navigate(`/cache/lessons/${encodeURIComponent(l.lessonId ?? NO_LESSON)}`, {
      state: { lessonName: l.lessonName ?? null },
    });

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Darslar</h1>
          <p className="mt-0.5 text-sm text-zinc-400">{lessons.length} ta dars · TTS tarixidan</p>
        </div>
        <button
          onClick={load}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/5"
        >
          ↻ Yangilash
        </button>
      </header>

      {loading ? (
        <p className="text-zinc-500">Yuklanmoqda…</p>
      ) : error ? (
        <p className="text-rose-400">Xato: {error}</p>
      ) : lessons.length === 0 ? (
        <p className="text-zinc-500">Hali dars yo'q.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lessons.map((l) => {
            const none = l.lessonId === null;
            return (
              <button
                key={l.lessonId ?? NO_LESSON}
                onClick={() => open(l)}
                className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className={`text-base font-semibold ${none ? "italic text-zinc-400" : "text-white"}`}>
                    {title(l)}
                  </h2>
                  <span className="text-zinc-600 transition group-hover:text-indigo-300">›</span>
                </div>

                {!none && <p className="mt-1 truncate font-mono text-xs text-zinc-500">{l.lessonId}</p>}

                <div className="mt-4 flex items-center gap-2">
                  <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs text-indigo-200">
                    {l.speechCount} ovoz
                  </span>
                  <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-zinc-400">
                    {l.requestCount} so'rov
                  </span>
                </div>

                <p className="mt-3 text-xs text-zinc-500">so'nggi: {fmtDate(l.lastUsed)}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
