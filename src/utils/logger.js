// @ts-check
const pino = require("pino");

const APP_MODE = process.env.APP_MODE || "local";
const IS_CLOUD = APP_MODE === "cloud";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: IS_CLOUD ? undefined : {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname"
    }
  }
});

module.exports = logger;
