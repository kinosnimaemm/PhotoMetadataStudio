// @ts-check
const { spawn } = require("node:child_process");

// Максимальное время работы дочернего процесса. Защищает очередь (всего 2 слота)
// от зависания на повреждённом или вредоносном файле.
const DEFAULT_TIMEOUT_MS = Number(process.env.COMMAND_TIMEOUT_MS || 60_000);

/**
 * Вешает таймаут на дочерний процесс: по истечении убивает его SIGKILL.
 * @param {import("node:child_process").ChildProcess} child
 * @param {number} timeoutMs
 * @returns {{ cancel: () => void, timedOut: () => boolean }}
 */
function armTimeout(child, timeoutMs) {
  let fired = false;
  const timer = setTimeout(() => {
    fired = true;
    child.kill("SIGKILL");
  }, timeoutMs);
  timer.unref();
  return { cancel: () => clearTimeout(timer), timedOut: () => fired };
}

/**
 * Запускает системную команду (без возврата вывода, только статус).
 * Поддерживает AbortSignal и таймаут (по умолчанию 60 секунд).
 * @param {string} program Имя программы
 * @param {string[]} args Аргументы
 * @param {import("node:child_process").SpawnOptions & { timeoutMs?: number }} [options={}] Опции (включая signal и timeoutMs)
 * @returns {Promise<void>}
 */
function runCommand(program, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { stdio: ["ignore", "pipe", "pipe"], ...options });
    const watchdog = armTimeout(child, options.timeoutMs || DEFAULT_TIMEOUT_MS);
    let stderr = "";
    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }
    child.on("error", (error) => {
      watchdog.cancel();
      reject(error);
    });
    child.on("close", (code) => {
      watchdog.cancel();
      if (watchdog.timedOut()) {
        return reject(new Error(`${program} прерван: превышено время обработки.`));
      }
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
 * Поддерживает AbortSignal и таймаут.
 * @param {string} program Имя программы
 * @param {string[]} args Аргументы
 * @param {import("node:child_process").SpawnOptions & { timeoutMs?: number }} [options={}] Опции (включая signal и timeoutMs)
 * @returns {Promise<string>} Вывод команды
 */
function runCommandOutput(program, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { stdio: ["ignore", "pipe", "pipe"], ...options });
    // Для osascript (диалог выбора папки) таймаут больше: пользователь думает.
    const watchdog = armTimeout(child, options.timeoutMs || 5 * 60_000);
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
    child.on("error", (error) => {
      watchdog.cancel();
      reject(error);
    });
    child.on("close", (code) => {
      watchdog.cancel();
      if (watchdog.timedOut()) {
        return reject(new Error(`${program} прерван: превышено время ожидания.`));
      }
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
