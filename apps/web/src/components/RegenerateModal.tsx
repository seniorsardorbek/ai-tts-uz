import { useState } from "react";
import type { CacheItem, Gender } from "@ai-tts/shared";
import { commitRegenerate, discardPreview, previewAudioUrl, regeneratePreview } from "../api";

/* Regenerate (replace) a slot's audio from a different prompt/voice, keeping the
   same cache key + displayed text. Opened via the `?regen=<key>` URL query. */
export default function RegenerateModal({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={close}>
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">Ovozni qayta yaratish</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Bu slot ({item.gender === "f" ? "Ayol" : "Erkak"}) bir xil kalit bilan saqlanadi — ko'rsatiladigan matn
          o'zgarmaydi. Faqat eshitiriladigan audio almashtiriladi.
        </p>
        <p className="mt-2 text-[11px] text-amber-300/90">⚠️ Matn va ovoz bir-biriga mos kelmasligi mumkin.</p>

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
