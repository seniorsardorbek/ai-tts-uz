import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getUsername, logout } from "../auth";

const NAV = [
  { to: "/", label: "TTS generator", icon: "🎙", end: true },
  { to: "/cache", label: "Darslar / Cache", icon: "📚", end: false },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // mobile drawer
  const username = getUsername();

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const Sidebar = (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-white/10 bg-black/30 backdrop-blur">
      <div className="px-5 py-5">
        <div className="text-lg font-semibold text-white">AI TTS</div>
        <div className="text-xs text-zinc-500">Admin panel</div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-400/30"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`
            }
          >
            <span className="text-base">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="px-2 pb-2 text-xs text-zinc-500">
          Tizimda: <span className="text-zinc-300">{username || "admin"}</span>
        </div>
        <button
          onClick={signOut}
          className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
        >
          Chiqish
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-full">
      {/* desktop sidebar */}
      <div className="hidden md:block md:sticky md:top-0 md:h-screen">{Sidebar}</div>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 h-full">{Sidebar}</div>
        </div>
      )}

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* mobile top bar */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 md:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg border border-white/10 px-2.5 py-1 text-zinc-300"
            aria-label="Menyu"
          >
            ☰
          </button>
          <span className="font-semibold text-white">AI TTS</span>
        </div>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
