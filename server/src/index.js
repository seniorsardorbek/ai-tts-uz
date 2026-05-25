import "dotenv/config";
import express from "express";
import cors from "cors";
import ttsRoute from "./routes/tts.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: CLIENT_ORIGIN }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/tts", ttsRoute);

app.listen(PORT, () => {
  console.log(`TTS server listening on http://localhost:${PORT}`);
  console.log(`Allowed origin: ${CLIENT_ORIGIN}`);
  const hasAny =
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY_UZ ||
    process.env.GEMINI_API_KEY_RU;
  if (!hasAny) {
    console.warn(
      "⚠  No Gemini key set (GEMINI_API_KEY / GEMINI_API_KEY_UZ / GEMINI_API_KEY_RU) — requests will fail.",
    );
  } else {
    const keys = [
      process.env.GEMINI_API_KEY_UZ ? "UZ" : null,
      process.env.GEMINI_API_KEY_RU ? "RU" : null,
      process.env.GEMINI_API_KEY ? "fallback" : null,
    ].filter(Boolean);
    console.log(`Gemini keys available: ${keys.join(", ")}`);
  }
});
