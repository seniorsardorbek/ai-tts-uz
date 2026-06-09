import "dotenv/config";
import express from "express";
import cors from "cors";
import ttsRoute from "./routes/tts.js";
import gradeRoute from "./routes/grade.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// CORS allowlist — only these origins may read responses from a browser.
// Override with CORS_ORIGINS env (comma-separated). No trailing slash: the
// browser's Origin header never includes a path. NOTE: this only blocks
// cross-origin fetch/XHR reads in browsers; it is not auth (curl, server-to-
// server, and <audio src> media requests are not affected by CORS).
const DEFAULT_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://juniorit.vercel.app",
  "https://go.junior-it.uz",
];
const CORS_ORIGINS = (process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : DEFAULT_CORS_ORIGINS
).map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // allow no-Origin requests (curl, <audio>, server-to-server) and allowlisted origins
    if (!origin || CORS_ORIGINS.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
}));
app.use(express.json({ limit: "1mb" })); // text-mode grading bodies only; skips multipart + GET tts

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/tts", ttsRoute);
app.use("/api/grade", gradeRoute);


app.listen(PORT, () => {
  console.log(`TTS server listening on http://localhost:${PORT}`);
  console.log(`CORS: open to all origins`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠  GEMINI_API_KEY is not set — requests will fail.");
  }
});
