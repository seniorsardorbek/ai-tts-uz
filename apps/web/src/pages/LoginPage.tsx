import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login } from "../auth";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(String((err as Error).message || err));
      setBusy(false);
    }
  };

  return (
    <main className="min-h-full flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <header className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300/70">Adminka</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Kirish</h1>
        </header>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-white/10 bg-white/4 backdrop-blur p-6 shadow-2xl shadow-indigo-950/30"
        >
          <label htmlFor="u" className="block text-xs font-medium text-zinc-400 mb-2">Login</label>
          <input
            id="u"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          />

          <label htmlFor="p" className="block text-xs font-medium text-zinc-400 mb-2 mt-4">Parol</label>
          <input
            id="p"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          />

          {error && <p className="mt-4 text-xs text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={busy || !username.trim() || !password}
            className="mt-6 w-full rounded-xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 disabled:bg-zinc-700 disabled:text-zinc-400 px-5 py-3 font-medium text-white transition shadow-lg shadow-indigo-900/40"
          >
            {busy ? "Kirilmoqda…" : "Kirish"}
          </button>
        </form>
      </div>
    </main>
  );
}
