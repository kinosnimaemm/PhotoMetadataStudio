// @ts-check
const { spawn } = require("node:child_process");

/**
 * Запускает системную команду (без возврата вывода, только статус).
 * Поддерживает AbortSignal.
 * @param {string} program Имя программы
 * @param {string[]} args Аргументы
 * @param {import("node:child_process").SpawnOptions} [options={}] Опции (включая signal)
 * @returns {Promise<void>}
 */
function runCommand(program, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { stdio: ["ignore", "pipe", "pipe"], ...options });
    let stderr = "";
    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (options.signal && options.signal.aborted) {
        return reject(new Error("Процесс отменен пользователем."));
      }
      if (code === 0 || code === null) resolve(); // code is null when killed
      else reject(new Error(stderr.trim() || `${program} завершился с кодом ${code}`));
    });
  });
}

/**
 * Запускает системную команду и возвращает её stdout.
 * Поддерживает AbortSignal.
 * @param {string} program Имя программы
 * @param {string[]} args Аргументы
 * @param {import("node:child_process").SpawnOptions} [options={}] Опции (включая signal)
 * @returns {Promise<string>} Вывод команды
 */
function runCommandOutput(program, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { stdio: ["ignore", "pipe", "pipe"], ...options });
    let stdout = "";
    let stderr = "";
    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
    }
    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (options.signal && options.signal.aborted) {
        return reject(new Error("Процесс отменен пользователем."));
      }
      if (code === 0 || code === null) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `${program} завершился с кодом ${code}`));
    });
  });
}

module.exports = {
  runCommand,
  runCommandOutput
};
