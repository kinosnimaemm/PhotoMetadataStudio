// @ts-check

/**
 * Простой rate limiter в памяти (скользящее окно по IP).
 * Без внешних зависимостей; для одной реплики этого достаточно.
 */

/**
 * @param {{ windowMs: number, max: number, message?: string }} options
 * @returns {import("express").RequestHandler}
 */
function createRateLimiter({ windowMs, max, message }) {
  /** @type {Map<string, number[]>} */
  const hits = new Map();

  // Периодическая чистка, чтобы Map не рос бесконечно.
  const cleaner = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, stamps] of hits) {
      const fresh = stamps.filter((stamp) => stamp > cutoff);
      if (fresh.length) hits.set(key, fresh);
      else hits.delete(key);
    }
  }, windowMs);
  cleaner.unref();

  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const fresh = (hits.get(key) || []).filter((stamp) => now - stamp < windowMs);
    if (fresh.length >= max) {
      const retryAfter = Math.ceil((fresh[0] + windowMs - now) / 1000);
      res.set("Retry-After", String(Math.max(1, retryAfter)));
      return res.status(429).json({ error: message || "Слишком много запросов. Попробуйте чуть позже." });
    }
    fresh.push(now);
    hits.set(key, fresh);
    next();
  };
}

module.exports = { createRateLimiter };
