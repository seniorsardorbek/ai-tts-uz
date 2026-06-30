import { useState } from "react";
import type { CacheItem } from "@ai-tts/shared";
import { cacheAudioUrl, deleteCache } from "../api";
import { fmtDate, fmtSize } from "../lib/format";

export default function VoiceCard({
  item,
  bust,
  onRegenerate,
  onDeleted,
}: {
  item: CacheItem;
  bust?: number;
  onRegenerate: (item: CacheItem) => void;
  onDeleted: (key: string) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  // After a regenerate-commit the live mp3 is overwritten — bust the 1h browser cache.
  const src = bust ? `${cacheAudioUrl(item.gender, item.key)}?t=${bust}` : cacheAudioUrl(item.gender, item.key);

  const female = item.gender === "f";

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(item.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  const remove = async () => {
    if (!window.confirm(`O'chirilsinmi?\n\n"${item.text ?? item.key}"`)) return;
    setDeleting(true);
    try {
      await deleteCache(item.gender, item.key);
      onDeleted(item.key);
    } catch (e) {
      alert(`O'chirib bo'lmadi: ${(e as Error).message || e}`);
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] hover:border-white/20 transition p-4">
      {/* gender + full text */}
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${
            female ? "bg-fuchsia-500/20 text-fuchsia-200" : "bg-sky-500/20 text-sky-200"
          }`}
        >
          {female ? "Ayol" : "Erkak"}
        </span>
        {item.text ? (
          <p className="text-[15px] leading-relaxed text-zinc-100 whitespace-pre-wrap break-words">{item.text}</p>
        ) : (
          <p className="text-sm italic text-zinc-600">— (eski yozuv, matn yo'q)</p>
        )}
      </div>

      {/* meta */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
        <button
          onClick={copyKey}
          title="Kalitni nusxalash"
          className="font-mono text-zinc-400 hover:text-zinc-200 transition"
        >
          🔑 {item.key.slice(0, 10)}…{copied && <span className="ml-1 text-emerald-400">nusxalandi</span>}
        </button>
        <span>·</span>
        <span>{fmtSize(item.sizeBytes)}</span>
        <span>·</span>
        <span>{fmtDate(item.createdAt)}</span>
      </div>

      {/* actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {playing ? (
          <audio autoPlay controls src={src} onEnded={() => setPlaying(false)} className="h-9 max-w-[280px]" />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-medium"
          >
            ▶ Eshitish
          </button>
        )}
        <button
          onClick={() => onRegenerate(item)}
          className="px-3 py-1.5 rounded-lg border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 text-xs font-medium"
        >
          ♻️ Qayta yaratish
        </button>
        <button
          onClick={remove}
          disabled={deleting}
          className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 text-xs font-medium disabled:opacity-50"
        >
          {deleting ? "…" : "🗑 O'chirish"}
        </button>
      </div>
    </div>
  );
}
