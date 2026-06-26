import { useEffect, useMemo, useState } from "react";

// TTS cache admin page — lists cached speeches (text, time, gender, size),
// lets you preview the audio and delete entries. Self-contained: inline styles,
// no CSS framework needed. Drop into any React app and route to it.
//
// Set API_BASE to your TTS server (or a proxy path that reaches it).
const API_BASE = "http://13.140.151.160";

type Item = {
  key: string;
  gender: "m" | "f";
  text: string | null;
  createdAt: string;
  sizeBytes: number;
};

type SortKey = "date" | "size";

const fmtSize = (b: number) => `${(b / 1024).toFixed(1)} KB`;
const fmtDate = (iso: string) => new Date(iso).toLocaleString();
const fmtTotal = (b: number) =>
  b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;

export default function CacheAdmin() {
  const [items, setItems] = useState<Item[]>([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [playing, setPlaying] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/cache`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotalBytes(data.totalBytes ?? 0);
    } catch (e) {
      setError(String((e as Error).message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const view = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? items.filter((i) => (i.text ?? "").toLowerCase().includes(q) || i.key.includes(q))
      : items;
    const sorted = [...filtered].sort((a, b) =>
      sort === "size"
        ? b.sizeBytes - a.sizeBytes
        : a.createdAt < b.createdAt
          ? 1
          : -1,
    );
    return sorted;
  }, [items, query, sort]);

  const remove = async (it: Item) => {
    if (!window.confirm(`O'chirilsinmi?\n\n"${it.text ?? it.key}"`)) return;
    setDeleting(it.key);
    try {
      const res = await fetch(`${API_BASE}/api/cache/${it.gender}/${it.key}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems((prev) => prev.filter((x) => x.key !== it.key));
      if (playing === it.key) setPlaying(null);
    } catch (e) {
      alert(`O'chirib bo'lmadi: ${(e as Error).message || e}`);
    } finally {
      setDeleting(null);
    }
  };

  const S = styles;
  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.h1}>TTS cache</h1>
        <div style={S.meta}>
          {view.length}/{items.length} ta · {fmtTotal(totalBytes)}
          <button style={S.refresh} onClick={load}>↻ Yangilash</button>
        </div>
      </div>

      <div style={S.controls}>
        <input
          style={S.search}
          placeholder="Matn yoki hash bo'yicha qidirish…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select style={S.select} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="date">Saralash: yangi → eski</option>
          <option value="size">Saralash: hajm (katta → kichik)</option>
        </select>
      </div>

      {loading ? (
        <p style={S.dim}>Yuklanmoqda…</p>
      ) : error ? (
        <p style={S.err}>Xato: {error}</p>
      ) : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Ovoz</th>
                <th style={S.th}>Matn</th>
                <th style={S.th}>Yaratilgan</th>
                <th style={{ ...S.th, textAlign: "right" }}>Hajm</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {view.map((it) => (
                <tr key={it.key} style={S.tr}>
                  <td style={S.td}>
                    <span style={it.gender === "f" ? S.badgeF : S.badgeM}>
                      {it.gender === "f" ? "Ayol" : "Erkak"}
                    </span>
                  </td>
                  <td style={S.td}>
                    {it.text ? (
                      <span title={it.text}>{it.text}</span>
                    ) : (
                      <span style={S.noText} title={it.key}>— (eski, matn yo'q)</span>
                    )}
                  </td>
                  <td style={{ ...S.td, ...S.dim, whiteSpace: "nowrap" }}>{fmtDate(it.createdAt)}</td>
                  <td style={{ ...S.td, textAlign: "right", ...S.dim, whiteSpace: "nowrap" }}>
                    {fmtSize(it.sizeBytes)}
                  </td>
                  <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                    {playing === it.key ? (
                      <audio
                        autoPlay
                        controls
                        style={{ height: 32, verticalAlign: "middle" }}
                        src={`${API_BASE}/api/cache/${it.gender}/${it.key}/audio`}
                        onEnded={() => setPlaying(null)}
                      />
                    ) : (
                      <button style={S.play} onClick={() => setPlaying(it.key)}>▶ Eshitish</button>
                    )}
                    <button
                      style={S.del}
                      disabled={deleting === it.key}
                      onClick={() => remove(it)}
                    >
                      {deleting === it.key ? "…" : "🗑 O'chirish"}
                    </button>
                  </td>
                </tr>
              ))}
              {view.length === 0 && (
                <tr>
                  <td style={{ ...S.td, ...S.dim }} colSpan={5}>Hech narsa topilmadi.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1000, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif", color: "#e5e7eb", background: "#0b0b0f", minHeight: "100vh" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  h1: { fontSize: 22, fontWeight: 600, margin: 0 },
  meta: { fontSize: 13, color: "#9ca3af", display: "flex", alignItems: "center", gap: 12 },
  refresh: { background: "transparent", border: "1px solid #2a2a35", color: "#cbd5e1", padding: "4px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13 },
  controls: { display: "flex", gap: 10, marginBottom: 14 },
  search: { flex: 1, background: "#16161d", border: "1px solid #2a2a35", color: "#e5e7eb", padding: "9px 12px", borderRadius: 10, fontSize: 14, outline: "none" },
  select: { background: "#16161d", border: "1px solid #2a2a35", color: "#e5e7eb", padding: "9px 10px", borderRadius: 10, fontSize: 13 },
  tableWrap: { border: "1px solid #1f1f29", borderRadius: 12, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "10px 12px", background: "#13131a", color: "#9ca3af", fontWeight: 500, fontSize: 12, borderBottom: "1px solid #1f1f29" },
  tr: { borderBottom: "1px solid #15151c" },
  td: { padding: "10px 12px", verticalAlign: "middle", maxWidth: 380, overflow: "hidden", textOverflow: "ellipsis" },
  dim: { color: "#9ca3af" },
  noText: { color: "#6b7280", fontStyle: "italic" },
  err: { color: "#f87171" },
  badgeF: { background: "#3b1d52", color: "#e9d5ff", padding: "2px 8px", borderRadius: 999, fontSize: 12 },
  badgeM: { background: "#13314f", color: "#bfdbfe", padding: "2px 8px", borderRadius: 999, fontSize: 12 },
  play: { background: "#4f46e5", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13, marginRight: 8 },
  del: { background: "transparent", color: "#f87171", border: "1px solid #4a1f1f", padding: "5px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13 },
};
