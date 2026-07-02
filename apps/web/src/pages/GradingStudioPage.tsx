import { useEffect, useRef, useState } from "react";
import type { GradeResult, Lang } from "@ai-tts/shared";
import { gradeTextApi, gradeVoiceApi } from "../api";

type Mode = "voice" | "text";
type RecState = "idle" | "rec" | "done";

interface Attempt {
  id: number;
  mode: Mode;
  lang: Lang;
  question: string;
  result: GradeResult;
  ms: number;
}

const SAMPLE = {
  question: "Madinada ikkita olma bor edi, Sardor bittasini tortib oldi. Madinada nechta olma qoldi?",
  rubric: "To'g'ri javob: bitta olma qoldi. O'quvchi \"bitta\" yoki \"1\" desa to'g'ri hisoblanadi.",
};

const fmtSec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function GradingStudioPage() {
  const [question, setQuestion] = useState("");
  const [rubric, setRubric] = useState("");
  const [lang, setLang] = useState<Lang>("uz");
  const [mode, setMode] = useState<Mode>("voice");
  const [answerText, setAnswerText] = useState("");

  // recorder
  const [recState, setRecState] = useState<RecState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // result
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<Attempt | null>(null);
  const [history, setHistory] = useState<Attempt[]>([]);

  const stopTimer = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const dropRecording = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlob(null);
    setBlobUrl(null);
    setRecState("idle");
    setElapsed(0);
  };

  // release mic/timer/url on unmount
  useEffect(
    () => () => {
      stopTimer();
      const rec = recRef.current;
      if (rec && rec.state !== "inactive") {
        rec.stream.getTracks().forEach((t) => t.stop());
        try {
          rec.stop();
        } catch {}
      }
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const startRec = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Bu brauzer ovoz yozishni qo'llamaydi.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const b = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (b.size === 0) {
          setError("Ovoz yozilmadi — qayta urinib ko'ring.");
          setRecState("idle");
          return;
        }
        setBlob(b);
        setBlobUrl(URL.createObjectURL(b));
        setRecState("done");
      };
      dropRecording();
      recRef.current = rec;
      rec.start();
      setRecState("rec");
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (e) {
      setError(`Mikrofonga ruxsat berilmadi: ${(e as Error).message || e}`);
    }
  };

  const stopRec = () => {
    stopTimer();
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  };

  const canSubmit =
    !busy &&
    question.trim().length > 0 &&
    rubric.trim().length > 0 &&
    (mode === "voice" ? !!blob : answerText.trim().length >= 3);

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const t0 = performance.now();
    try {
      const result =
        mode === "voice"
          ? await gradeVoiceApi(question.trim(), rubric.trim(), lang, blob!)
          : await gradeTextApi(question.trim(), rubric.trim(), lang, answerText.trim());
      const attempt: Attempt = {
        id: Date.now(),
        mode,
        lang,
        question: question.trim(),
        result,
        ms: performance.now() - t0,
      };
      setCurrent(attempt);
      setHistory((h) => [attempt, ...h].slice(0, 10));
    } catch (e) {
      setError(String((e as Error).message || e));
    } finally {
      setBusy(false);
    }
  };

  const pill = (active: boolean) =>
    `px-3 py-1.5 text-xs rounded-md transition ${active ? "bg-indigo-500 text-white" : "text-zinc-400 hover:text-zinc-200"}`;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Baholash studio</h1>
        <p className="mt-0.5 text-sm text-zinc-400">
          AI grading'ni sinash — savol va mezonni yozing, javobni ovozda yozib yuboring yoki matnda kiriting.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---- form ---- */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg border border-white/10 bg-black/30 p-1">
              <button onClick={() => setLang("uz")} className={pill(lang === "uz")}>O'zbekcha</button>
              <button onClick={() => setLang("ru")} className={pill(lang === "ru")}>Ruscha</button>
            </div>
            <button
              onClick={() => {
                setQuestion(SAMPLE.question);
                setRubric(SAMPLE.rubric);
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Namuna qo'yish
            </button>
          </div>

          <label className="mb-1.5 block text-xs font-medium text-zinc-400">Savol</label>
          <textarea
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="O'quvchiga beriladigan savol…"
            className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          />

          <label className="mb-1.5 mt-4 block text-xs font-medium text-zinc-400">
            Baholash mezoni (rubrika) <span className="text-zinc-600">— AI shu mezon asosida baholaydi</span>
          </label>
          <textarea
            rows={3}
            value={rubric}
            onChange={(e) => setRubric(e.target.value)}
            placeholder="Qanday javob to'g'ri hisoblanadi…"
            className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          />

          <div className="mt-5 flex items-center gap-3">
            <span className="text-xs font-medium text-zinc-400">Javob</span>
            <div className="inline-flex rounded-lg border border-white/10 bg-black/30 p-1">
              <button onClick={() => setMode("voice")} disabled={recState === "rec"} className={pill(mode === "voice")}>
                🎤 Ovozli
              </button>
              <button onClick={() => setMode("text")} disabled={recState === "rec"} className={pill(mode === "text")}>
                ⌨️ Matnli
              </button>
            </div>
          </div>

          {mode === "voice" ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
              {recState === "idle" && (
                <button
                  onClick={startRec}
                  className="w-full rounded-xl bg-rose-500 px-4 py-3 font-medium text-white transition hover:bg-rose-400"
                >
                  ● Yozishni boshlash
                </button>
              )}
              {recState === "rec" && (
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-rose-300">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
                    Yozilmoqda… {fmtSec(elapsed)}
                  </span>
                  <button
                    onClick={stopRec}
                    className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
                  >
                    ■ To'xtatish
                  </button>
                </div>
              )}
              {recState === "done" && blobUrl && (
                <div className="space-y-3">
                  <audio controls src={blobUrl} className="h-9 w-full" />
                  <button onClick={dropRecording} className="text-xs text-zinc-400 hover:text-zinc-200">
                    ↺ Qayta yozish
                  </button>
                </div>
              )}
            </div>
          ) : (
            <textarea
              rows={3}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="O'quvchi javobi (matn ko'rinishida)…"
              className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            />
          )}

          {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="mt-5 w-full rounded-xl bg-indigo-500 px-5 py-3 font-medium text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-400 disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {busy ? "Baholanmoqda…" : "Baholash"}
          </button>
        </section>

        {/* ---- result + history ---- */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            {busy ? (
              <p className="text-sm text-zinc-400">⏳ Baholanmoqda…</p>
            ) : !current ? (
              <p className="text-sm text-zinc-500">Natija shu yerda ko'rinadi.</p>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      current.result.correct ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    {current.result.correct ? "✅ To'g'ri" : "❌ Noto'g'ri"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {current.mode === "voice" ? "🎤 ovozli" : "⌨️ matnli"} · {current.lang} ·{" "}
                    {(current.ms / 1000).toFixed(1)} s
                  </span>
                </div>

                {current.result.transcript !== undefined && (
                  <div className="mt-4">
                    <p className="mb-1 text-xs font-medium text-zinc-400">🎙 Transkript (ingliz tilida, AI eshitgani)</p>
                    <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-200 whitespace-pre-wrap break-words">
                      {current.result.transcript || <span className="italic text-zinc-500">(bo'sh)</span>}
                    </p>
                  </div>
                )}

                <div className="mt-4">
                  <p className="mb-1 text-xs font-medium text-zinc-400">Feedback</p>
                  <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm leading-relaxed text-zinc-100 whitespace-pre-wrap break-words">
                    {current.result.feedback}
                  </p>
                </div>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="mb-3 text-xs font-medium text-zinc-400">Sessiya tarixi</p>
              <ul className="space-y-1.5">
                {history.map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => setCurrent(a)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition hover:bg-white/5 ${
                        current?.id === a.id ? "bg-white/5" : ""
                      }`}
                    >
                      <span>{a.result.correct ? "✅" : "❌"}</span>
                      <span>{a.mode === "voice" ? "🎤" : "⌨️"}</span>
                      <span className="min-w-0 flex-1 truncate text-zinc-300">{a.question}</span>
                      <span className="shrink-0 text-zinc-500">{(a.ms / 1000).toFixed(1)} s</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
