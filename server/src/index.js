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
  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠  GEMINI_API_KEY is not set — requests will fail.");
  }
});
