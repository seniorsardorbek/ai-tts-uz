import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Gender } from "@ai-tts/shared";
import { ttsUrl } from "../api";
import { logout } from "../auth";

const SAMPLE =
  "Madinada ikkita olma bor edi lekin Sardor bittasini tortib oldi, Madinada nechta olma qoldi";

type Tone = "idle" | "info" | "error";

export default function TtsPage() {
  const [gender, setGender] = useState<Gender>("f");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<{ msg: string; tone: Tone }>({ msg: "", tone: "idle" });
  const [busy, setBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastUrl = useRef("");
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const play = () => {
    const t = text.trim();
    if (!t) return setStatus({ msg: "Matn kiriting.", tone: "error" });
    const url = ttsUrl(t, gender);
    lastUrl.current = url;
    setBusy(true);
    setStatus({ msg: "Oqim boshlanmoqda…", tone: "info" });
    const a = audioRef.current!;
    a.src = url;
    a.play().catch(() => {
      setStatus({ msg: "Avtomatik ijro ishlamadi — pleerda Play tugmasini bosing.", tone: "error" });
      setBusy(false);
    });
  };

  const toneClass =
    status.tone === "error" ? "text-rose-400" : status.tone === "info" ? "text-indigo-300" : "text-zinc-400";

  const tab = (g: Gender, label: string) => (
    <button
      type="button"
      onClick={() => setGender(g)}
      className={`px-4 py-1.5 text-sm rounded-lg transition ${
        gender === g ? "bg-indigo-500 text-white" : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <main className="min-h-full flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <header className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300/70">ElevenLabs v3 · Stream</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-white">Ovozli o'qib berish</h1>
          <p className="mt-2 text-sm text-zinc-400">Gap yozing, jinsini tanlang — ovoz darhol oqim qilib eshitiladi.</p>
          <div className="mt-2 flex items-center justify-center gap-4">
            <Link to="/cache" className="text-xs text-indigo-300 hover:text-indigo-200">
              → Cache boshqaruvi
            </Link>
            <button onClick={signOut} className="text-xs text-zinc-500 hover:text-zinc-300">
              Chiqish
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/4 backdrop-blur p-5 sm:p-6 shadow-2xl shadow-indigo-950/30">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Ovoz</span>
            <div role="tablist" className="inline-flex rounded-xl border border-white/10 bg-black/30 p-1">
              {tab("f", "Jessica · ayol")}
              {tab("m", "Liam · erkak")}
            </div>
          </div>

          <label htmlFor="txt" className="block text-xs font-medium text-zinc-400 mb-2">Matn</label>
          <textarea
            id="txt"
            rows={5}
            maxLength={1000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full resize-none rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
            placeholder="Bu yerga gap yozing…"
          />

          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span>{text.length} / 1000</span>
            <button type="button" onClick={() => setText(SAMPLE)} className="hover:text-zinc-300 transition">
              Namuna gap qo'yish
            </button>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <button
              onClick={play}
              disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 disabled:bg-zinc-700 disabled:text-zinc-400 px-5 py-3 font-medium text-white transition shadow-lg shadow-indigo-900/40"
            >
              {busy ? "Yuklanmoqda…" : "▶ Eshitish"}
            </button>
            <audio
              ref={audioRef}
              controls
              className="flex-1 w-full rounded-xl"
              onPlaying={() => {
                setBusy(false);
                setStatus({ msg: "Eshitilmoqda…", tone: "info" });
              }}
              onEnded={() => setStatus({ msg: "Tugadi.", tone: "idle" })}
              onError={(e) => {
                setBusy(false);
                if ((e.currentTarget as HTMLAudioElement).src === lastUrl.current)
                  setStatus({ msg: "Audio yuklab bo'lmadi. Server va kalit tekshiring.", tone: "error" });
              }}
            />
          </div>

          <div className={`mt-4 text-xs min-h-5 ${toneClass}`}>{status.msg}</div>
        </section>
      </div>
    </main>
  );
}
