// @ts-check
const express = require("express");
const path = require("node:path");
const logger = require("./src/utils/logger");
const apiRoutes = require("./src/api/routes");

const APP_MODE = process.env.APP_MODE || "local";
const HOST = process.env.HOST || (APP_MODE === "cloud" ? "0.0.0.0" : "127.0.0.1");
const PORT = Number(process.env.PORT || 4317);
const PUBLIC = path.join(__dirname, "public");

const app = express();

// За обратным прокси (Render/Railway) доверяем первому X-Forwarded-For,
// иначе rate limiter будет видеть IP прокси вместо IP клиента.
if (APP_MODE === "cloud") app.set("trust proxy", 1);

// Базовые security-заголовки (без зависимости от helmet)
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.googleusercontent.com https://avatars.githubusercontent.com",
      "connect-src 'self' https://*.supabase.co",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join("; ")
  });
  next();
});

// Защита от CSRF: браузерные кросс-сайтовые запросы приходят с чужим Origin.
// Запросы без Origin (curl, тесты, same-origin навигация) пропускаем.
app.use((req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  try {
    if (new URL(origin).host === req.headers.host) return next();
  } catch {}
  logger.warn({ origin, path: req.path }, "Отклонён кросс-сайтовый запрос");
  return res.status(403).json({ error: "Запрос с другого сайта отклонён." });
});

// Монтируем роуты API
app.use("/api", apiRoutes);

// JSON 404 для неизвестных API-маршрутов
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Маршрут не найден." });
});

// Раздаем статику
app.use(express.static(PUBLIC));

// Центральный обработчик ошибок: всегда JSON, без утечки стека наружу
app.use((err, req, res, _next) => {
  logger.error({ error: err.message, path: req.path }, "Необработанная ошибка");
  if (res.headersSent) return;
  res.status(500).json({ error: "Внутренняя ошибка сервера." });
});

// Запускаем сервер
const server = app.listen(PORT, HOST, () => {
  logger.info(`Photo Metadata Studio started on http://${HOST}:${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("Получен SIGTERM, закрываем сервер...");
  server.close(() => {
    process.exit(0);
  });
});
