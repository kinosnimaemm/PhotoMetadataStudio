// @ts-check
const express = require("express");
const path = require("node:path");
const logger = require("./src/utils/logger");
const apiRoutes = require("./src/api/routes");

const HOST = process.env.HOST || (process.env.APP_MODE === "cloud" ? "0.0.0.0" : "127.0.0.1");
const PORT = Number(process.env.PORT || 4317);
const PUBLIC = path.join(__dirname, "public");

const app = express();

// Монтируем роуты API
app.use("/api", apiRoutes);

// Раздаем статику
app.use(express.static(PUBLIC));

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
