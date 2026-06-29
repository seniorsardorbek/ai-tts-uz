import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

const DEFAULT_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://juniorit.vercel.app",
  "https://go.junior-it.uz",
];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: true });

  const raw = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : DEFAULT_CORS_ORIGINS;
  const allowed = raw.map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean);

  app.enableCors({
    origin(origin, cb) {
      // allow no-Origin requests (curl, <audio>, server-to-server) + allowlisted
      if (!origin || allowed.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
  });

  // text-mode grading bodies can include a long rubric
  app.useBodyParser("json", { limit: "1mb" });

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  new Logger("Bootstrap").log(`API listening on http://localhost:${port} (CORS: ${allowed.join(", ")})`);
}
bootstrap();
