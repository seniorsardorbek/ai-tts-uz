import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getToken, logout, me } from "../auth";

// Gate: no token -> /login. With a token, validate it once via /api/auth/me;
// if it's expired/invalid, drop it and bounce to /login.
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<"checking" | "ok" | "fail">(getToken() ? "checking" : "fail");

  useEffect(() => {
    let alive = true;
    if (!getToken()) {
      setState("fail");
      return;
    }
    me()
      .then(() => alive && setState("ok"))
      .catch(() => {
        logout();
        if (alive) setState("fail");
      });
    return () => {
      alive = false;
    };
  }, []);

  if (state === "checking") {
    return (
      <main className="min-h-full flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Tekshirilmoqda…</p>
      </main>
    );
  }

  if (state === "fail") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
