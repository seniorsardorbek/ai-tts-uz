import { API_BASE } from "./api";

const TOKEN_KEY = "ai-tts-admin-token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function logout(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function isAuthed(): boolean {
  return !!getToken();
}

// POST credentials -> store the JWT. Throws on bad credentials / network error.
export async function login(username: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (res.status === 401) throw new Error("Login yoki parol noto'g'ri");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { token: string; username: string };
  setToken(data.token);
  return data.username;
}

// Validate the persisted token (used on app load). Returns the username or throws.
export async function me(): Promise<string> {
  const token = getToken();
  if (!token) throw new Error("no token");
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { username: string };
  return data.username;
}
