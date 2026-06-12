// @ts-check

class Queue {
  /**
   * @param {number} concurrency Максимальное количество одновременно выполняемых задач
   */
  constructor(concurrency) {
    this.concurrency = concurrency;
    this.active = 0;
    this.waiting = [];
  }

  /**
   * Добавляет задачу в очередь. Если лимит не превышен, запускает сразу.
   * @param {() => Promise<any>} task Асинхронная задача
   * @param {AbortSignal} [signal] Сигнал отмены (чтобы выкинуть из ожидания)
   * @returns {Promise<any>}
   */
  async add(task, signal) {
    if (this.active >= this.concurrency) {
      await new Promise((resolve, reject) => {
        const onAbort = () => {
          const idx = this.waiting.findIndex((w) => w.resolve === resolve);
          if (idx > -1) {
            this.waiting.splice(idx, 1);
          }
          reject(new Error("Отменено пользователем (убрано из очереди)"));
        };

        if (signal) {
          if (signal.aborted) return reject(new Error("Отменено до начала"));
          signal.addEventListener("abort", onAbort, { once: true });
        }

        this.waiting.push({ resolve, signal, onAbort });
      });
    }

    this.active++;
    try {
      return await task();
    } finally {
      this.active--;
      this.next();
    }
  }

  next() {
    if (this.waiting.length > 0 && this.active < this.concurrency) {
      const nextTask = this.waiting.shift();
      if (nextTask && nextTask.signal) {
        nextTask.signal.removeEventListener("abort", nextTask.onAbort);
      }
      if (nextTask) nextTask.resolve();
    }
  }
}

// Экспортируем синглтон очереди на 2 параллельных задачи (FFmpeg/ExifTool тяжелые)
const processQueue = new Queue(2);

module.exports = { Queue, processQueue };
