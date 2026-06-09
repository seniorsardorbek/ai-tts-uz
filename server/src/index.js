import "dotenv/config";
import express from "express";
import cors from "cors";
import ttsRoute from "./routes/tts.js";
import gradeRoute from "./routes/grade.js";
import { requireToken } from "./lib/auth.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// CORS open to all origins — public TTS API (no cookies/credentials),
// so any site can call it. Reflects request origin + allows `*`.
app.use(cors());
app.use(express.json({ limit: "1mb" })); // text-mode grading bodies only; skips multipart + GET tts

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/tts", requireToken, ttsRoute);
app.use("/api/grade", requireToken, gradeRoute);


app.listen(PORT, () => {
  console.log(`TTS server listening on http://localhost:${PORT}`);
  console.log(`CORS: open to all origins`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠  GEMINI_API_KEY is not set — requests will fail.");
  }
});
