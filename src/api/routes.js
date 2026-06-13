// @ts-check
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const Busboy = require("busboy");
const database = require("../database");
const logger = require("../utils/logger");
const { supabase } = require("../utils/supabase");
const { processQueue } = require("../utils/queue");
const { validateCustomProfile, outputName, safeName } = require("../utils/profile");
const { parseWallTime } = require("../utils/date");
const { sniffImageFile } = require("../utils/filetype");
const { createRateLimiter } = require("../utils/ratelimit");

async function requireAuth(req, res, next) {
  if (process.env.APP_MODE !== "cloud") { req.user = null; return next(); }
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Необходима авторизация" });
  if (!supabase) return res.status(501).json({ error: "Supabase не настроен на сервере" });
  
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: "Неверный или просроченный токен" });
  }
  req.user = data.user;
  next();
}
const { runExifTool } = require("../utils/exif");
const { runCommand, runCommandOutput } = require("../utils/exec");

const router = express.Router();

const APP_MODE = process.env.APP_MODE || "local";
const IS_CLOUD = APP_MODE === "cloud";
const ZIP_BIN = process.env.ZIP_BIN || "zip";

const MAX_FILE_SIZE = 80 * 1024 * 1024;
const MAX_FILES = 10;
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".heic", ".png", ".tif", ".tiff", ".webp"]);

const outputBatches = new Map();
// Прогресс обработки по клиентскому токену: { done, total, current }
const progressByClient = new Map();
// Note: We need to resolve from project root
const profiles = JSON.parse(fs.readFileSync(path.join(__dirname, "../../profiles.json"), "utf8"));
const profileMap = new Map(profiles.map((p) => [p.id, p]));

// Rate limiting тяжёлых эндпоинтов (актуально в облаке; локально не мешает)
const processLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: IS_CLOUD ? 12 : 240,
  message: "Слишком много партий за короткое время. Подождите несколько минут."
});
const downloadLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: IS_CLOUD ? 60 : 600
});

router.get("/runtime", (req, res) => {
  res.json({ mode: APP_MODE, localSave: !IS_CLOUD, database: database.configured });
});

router.get("/config", (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseKey: process.env.SUPABASE_KEY || ""
  });
});

router.get("/health", async (req, res) => {
  try {
    const db = await database.health();
    res.json({ ok: true, mode: APP_MODE, database: db });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

router.get("/profiles", (req, res) => {
  res.json(profiles);
});

router.get("/user/credits", requireAuth, async (req, res) => {
  try {
    const client = await database.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("SELECT credits, subscription_end_date, last_daily_grant_date FROM public.user_credits WHERE user_id = $1 FOR UPDATE", [req.user.id]);
      if (!result.rowCount) {
        await client.query("ROLLBACK");
        return res.json({ credits: 0, unlimited: false });
      }
      let { credits, subscription_end_date, last_daily_grant_date } = result.rows[0];
      const isUnlimited = subscription_end_date && new Date(subscription_end_date) > new Date();

      // MAGIC: Grant 99999 to Nano Bananno
      const name = req.user.user_metadata?.name || req.user.user_metadata?.full_name || "";
      if (name.includes("Nano Bananno") && credits < 99999) {
        credits = 99999;
        await client.query("UPDATE public.user_credits SET credits = 99999 WHERE user_id = $1", [req.user.id]);
      }

      // Daily +5 logic
      const today = new Date().toISOString().slice(0, 10);
      const lastGrantStr = last_daily_grant_date ? new Date(last_daily_grant_date).toISOString().slice(0, 10) : "";
      
      if (today !== lastGrantStr) {
        if (credits < 50) credits = Math.min(50, credits + 5);
        await client.query("UPDATE public.user_credits SET credits = $1, last_daily_grant_date = CURRENT_DATE WHERE user_id = $2", [credits, req.user.id]);
      }
      await client.query("COMMIT");

      res.json({ credits, unlimited: isUnlimited });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error({ error: error.message }, "Ошибка получения баланса");
    res.status(500).json({ error: "Не удалось получить баланс" });
  }
});

router.post("/process", requireAuth, processLimiter, (req, res) => {
  const ac = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded && !res.headersSent) {
      logger.warn("Запрос отменен клиентом (соединение закрыто).");
      ac.abort();
    }
  });

  const uploads = [];
  const writePromises = [];
  let selectedProfile = "";
  let customProfile = "";
  let namingMode = "iphone";
  let customName = "";
  let startNumber = crypto.randomInt(1, 9990);
  let startDateRaw = "";
  let intervalSeconds = 45;
  let clientToken = "";
  let fileTooLarge = false;
  let tooManyFiles = false;
  let rejectedFile = "";

  const busboy = Busboy({
    headers: req.headers,
    limits: { files: MAX_FILES, fileSize: MAX_FILE_SIZE, fields: 20 }
  });

  busboy.on("field", (name, value) => {
    if (name === "profile") selectedProfile = value;
    if (name === "customProfile") customProfile = value;
    if (name === "namingMode") namingMode = value;
    if (name === "customName") customName = value;
    if (name === "startNumber") startNumber = Math.min(9999, Math.max(1, Number(value) || 1));
    if (name === "startDate") startDateRaw = value;
    if (name === "intervalSeconds") intervalSeconds = Math.min(3600, Math.max(1, Number(value) || 45));
    if (name === "clientToken") clientToken = String(value).slice(0, 64);
  });

  busboy.on("file", (_name, stream, info) => {
    const originalName = safeName(info.filename);
    const extension = path.extname(originalName).toLowerCase();
    // Ранний отказ: не пишем на диск файлы с неподдерживаемым расширением
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      rejectedFile = rejectedFile || originalName;
      stream.resume();
      return;
    }
    const uploadPath = path.join(os.tmpdir(), `metadata-studio-${crypto.randomUUID()}${extension}`);
    const fileWrite = fs.createWriteStream(uploadPath, { flags: "wx" });
    uploads.push({ path: uploadPath, originalName });
    stream.on("limit", () => {
      fileTooLarge = true;
    });
    stream.pipe(fileWrite);
    writePromises.push(new Promise((resolve, reject) => {
      fileWrite.once("close", resolve);
      fileWrite.once("error", reject);
    }));
  });
  
  busboy.on("filesLimit", () => {
    tooManyFiles = true;
  });

  busboy.on("error", (error) => {
    if (!res.headersSent) res.status(400).json({ error: error.message });
  });

  busboy.on("close", async () => {
    try {
      await Promise.all(writePromises);
      if (tooManyFiles) throw Object.assign(new Error("Можно обработать максимум 10 фотографий."), { status: 400 });
      if (fileTooLarge) throw Object.assign(new Error("Один из файлов больше 80 МБ."), { status: 400 });
      if (rejectedFile) throw Object.assign(new Error(`Формат ${rejectedFile} пока не поддерживается.`), { status: 400 });
      if (!uploads.length) throw Object.assign(new Error("Фотографии не загружены."), { status: 400 });
      // Проверка магических байтов: расширение легко подделать,
      // а ExifTool/FFmpeg не должны получать на вход произвольные файлы.
      for (const upload of uploads) {
        const kind = await sniffImageFile(upload.path);
        if (!kind) throw new Error(`Файл ${upload.originalName} не похож на фотографию поддерживаемого формата.`);
      }
      const profile = selectedProfile === "custom" ? validateCustomProfile(customProfile) : profileMap.get(selectedProfile);
      if (!profile) throw new Error("Выбран неизвестный профиль.");

      // Введённое время трактуем как настенное время в таймзоне локации профиля
      const startDate = (startDateRaw && parseWallTime(startDateRaw, profile.timeZone)) || new Date();

      // Check and deduct credits (cloud mode only)
      let remainingCredits = 0;
      let isUnlimited = false;
      if (req.user) {
      const client = await database.pool.connect();
      try {
        await client.query("BEGIN");
        const userRes = await client.query("SELECT credits, subscription_end_date, last_daily_grant_date FROM public.user_credits WHERE user_id = $1 FOR UPDATE", [req.user.id]);
        if (!userRes.rowCount) throw new Error("Профиль не найден. Пожалуйста, обратитесь в поддержку.");
        
        let { credits, subscription_end_date, last_daily_grant_date } = userRes.rows[0];
        isUnlimited = subscription_end_date && new Date(subscription_end_date) > new Date();
        
        // MAGIC: Grant 99999 to Nano Bananno
        const name = req.user.user_metadata?.name || req.user.user_metadata?.full_name || "";
        if (name.includes("Nano Bananno") && credits < 99999) {
          credits = 99999;
          await client.query("UPDATE public.user_credits SET credits = 99999 WHERE user_id = $1", [req.user.id]);
        }

        // Daily +5 logic
        const today = new Date().toISOString().slice(0, 10);
        const lastGrantStr = last_daily_grant_date ? new Date(last_daily_grant_date).toISOString().slice(0, 10) : "";
        if (today !== lastGrantStr) {
          if (credits < 50) credits = Math.min(50, credits + 5);
          await client.query("UPDATE public.user_credits SET credits = $1, last_daily_grant_date = CURRENT_DATE WHERE user_id = $2", [credits, req.user.id]);
        }
        
        if (isUnlimited) {
          remainingCredits = credits;
        } else {
          if (credits < uploads.length) {
            throw new Error(`Недостаточно баланса. У вас ${credits} фото, вы пытаетесь загрузить ${uploads.length}. Подождите до завтра (будет +5) или перейдите на Unlimited.`);
          }
          await client.query("UPDATE public.user_credits SET credits = credits - $1 WHERE user_id = $2", [uploads.length, req.user.id]);
          remainingCredits = credits - uploads.length;
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
      }

      const token = crypto.randomUUID();
      const processed = [];
      logger.info({ batch: token, count: uploads.length, profile: profile.name }, "Начало обработки партии");

      if (clientToken) progressByClient.set(clientToken, { done: 0, total: uploads.length, current: "" });

      for (let index = 0; index < uploads.length; index += 1) {
        if (ac.signal.aborted) throw new Error("Обработка отменена пользователем.");
        const upload = uploads[index];
        const captureDate = new Date(startDate.getTime() + index * intervalSeconds * 1000);
        const name = outputName(upload.originalName, namingMode, customName, index, startNumber);
        if (clientToken) progressByClient.set(clientToken, { done: index, total: uploads.length, current: name });
        await processQueue.add(() => runExifTool(upload.path, profile, captureDate, index, ac.signal), ac.signal);
        processed.push({
          path: upload.path,
          name,
          captureDate: captureDate.toISOString()
        });
        if (clientToken) progressByClient.set(clientToken, { done: index + 1, total: uploads.length, current: name });
      }
      
      outputBatches.set(token, { files: processed, profile: profile.name, downloaded: new Set(), expiresAt: Date.now() + 15 * 60 * 1000 });
      logger.info({ batch: token, count: processed.length, profile: profile.name }, "Партия успешно обработана");
      
      setTimeout(() => {
        const batch = outputBatches.get(token);
        if (batch) {
          batch.files.forEach((item) => fs.rm(item.path, { force: true }, () => {}));
          logger.info({ batch: token }, "Временные файлы партии удалены по таймауту");
        }
        outputBatches.delete(token);
      }, 15 * 60 * 1000).unref();
      res.json({ 
        ok: true, 
        token, 
        count: processed.length, 
        files: processed,
        credits: remainingCredits,
        unlimited: isUnlimited
      });
    } catch (error) {
      uploads.forEach((item) => fs.rm(item.path, { force: true }, () => {}));
      if (!res.headersSent) {
        logger.error({ error: error.message }, "Ошибка обработки партии");
        res.status(error.status || 500).json({ error: error.message });
      }
    } finally {
      if (clientToken) {
        // Даём фронтенду секунду забрать финальный статус, затем чистим
        const finishedToken = clientToken;
        setTimeout(() => progressByClient.delete(finishedToken), 5000).unref();
      }
    }
  });

  req.pipe(busboy);
});

router.get("/progress/:clientToken", (req, res) => {
  const progress = progressByClient.get(req.params.clientToken);
  if (!progress) return res.status(404).json({ error: "Нет данных о прогрессе." });
  res.json(progress);
});

function uniqueDestination(directory, fileName) {
  const parsed = path.parse(fileName);
  let candidate = path.join(directory, fileName);
  let index = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(directory, `${parsed.name} ${index}${parsed.ext}`);
    index += 1;
  }
  return candidate;
}

const IS_MAC = process.platform === "darwin";

async function chooseSaveFolder(requestedDirectory) {
  if (requestedDirectory) {
    const resolved = path.resolve(requestedDirectory);
    const stats = await fs.promises.stat(resolved);
    if (!stats.isDirectory()) throw new Error("Выбранный путь не является папкой.");
    return resolved;
  }

  if (!IS_MAC) throw new Error("Системное окно выбора папки доступно только на macOS. Укажите папку параметром directory.");

  return runCommandOutput("/usr/bin/osascript", [
    "-e",
    'POSIX path of (choose folder with prompt "Куда сохранить обработанные фотографии?")'
  ]);
}

router.post("/save/:token", async (req, res) => {
  const { token } = req.params;
  const requestedDirectory = req.query.directory ? String(req.query.directory) : "";
  
  if (IS_CLOUD) {
    return res.status(409).json({ error: "Выбор папки доступен только в локальной версии.", cloud: true });
  }
  
  const batch = outputBatches.get(token);
  if (!batch || !batch.files.length || !batch.files.every((item) => fs.existsSync(item.path))) {
    return res.status(404).json({ error: "Файлы уже удалены или не найдены." });
  }

  try {
    const targetFolder = await chooseSaveFolder(requestedDirectory);
    const saved = [];
    for (const item of batch.files) {
      const destination = uniqueDestination(targetFolder, item.name);
      await fs.promises.copyFile(item.path, destination);
      // Очистка расширенных атрибутов (поле Where from) актуальна только на macOS
      if (IS_MAC) await runCommand("/usr/bin/xattr", ["-cr", destination]);
      saved.push(path.basename(destination));
      await fs.promises.rm(item.path, { force: true });
    }
    outputBatches.delete(token);

    // Fire and forget opening the folder (только macOS)
    if (IS_MAC) {
      const { spawn } = require("node:child_process");
      spawn("/usr/bin/open", [targetFolder], { detached: true, stdio: "ignore" }).unref();
    }
    
    logger.info({ batch: token, folder: targetFolder }, "Файлы успешно сохранены локально");
    res.json({ ok: true, count: saved.length, files: saved, path: targetFolder });
  } catch (error) {
    if (/User canceled|-128/.test(error.message)) {
      return res.status(409).json({ error: "Сохранение отменено.", canceled: true });
    }
    logger.error({ error: error.message }, "Ошибка локального сохранения");
    res.status(500).json({ error: `Не удалось сохранить файлы: ${error.message}` });
  }
});

router.get("/download-batch/:token", downloadLimiter, async (req, res) => {
  const { token } = req.params;
  const batch = outputBatches.get(token);
  if (!batch || !batch.files.length || !batch.files.every((item) => fs.existsSync(item.path))) {
    return res.status(404).json({ error: "Файлы уже удалены или не найдены." });
  }

  const staging = path.join(os.tmpdir(), `metadata-studio-zip-${crypto.randomUUID()}`);
  const zipPath = `${staging}.zip`;
  
  const ac = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) ac.abort();
  });

  try {
    await fs.promises.mkdir(staging);
    for (const item of batch.files) {
      await fs.promises.copyFile(item.path, path.join(staging, item.name));
    }
    await runCommand(ZIP_BIN, ["-q", "-r", zipPath, "."], { cwd: staging, signal: ac.signal });
    const fileName = `Metadata Studio ${new Date().toISOString().slice(0, 10)}.zip`;
    
    res.download(zipPath, fileName, (err) => {
      // Staging и сам ZIP больше не нужны в любом случае
      fs.rm(staging, { recursive: true, force: true }, () => {});
      fs.rm(zipPath, { force: true }, () => {});
      if (err) {
        // Передача оборвалась
        logger.error({ error: err.message, batch: token }, "Ошибка при скачивании архива");
        return;
      }
      logger.info({ batch: token }, "Архив успешно скачан");
    });
  } catch (error) {
    fs.rm(staging, { recursive: true, force: true }, () => {});
    fs.rm(zipPath, { force: true }, () => {});
    if (!res.headersSent) {
      res.status(500).json({ error: `Не удалось создать ZIP: ${error.message}` });
    }
  }
});

router.get("/download/:token/:index", downloadLimiter, (req, res) => {
  const { token, index } = req.params;
  const batch = outputBatches.get(token);
  const item = batch?.files[Number(index)];
  
  if (!item || !fs.existsSync(item.path)) {
    return res.status(404).json({ error: "Файл уже удалён или не найден." });
  }
  
  res.download(item.path, item.name, (err) => {
    if (err) {
      // Передача оборвалась
      logger.warn({ error: err.message, batch: token, file: item.name }, "Скачивание файла прервано");
      return;
    }
    batch.downloaded.add(Number(index));
  });
});

router.use(express.json());

router.get("/profiles/custom", requireAuth, async (req, res) => {
  try {
    if (!database.pool) throw new Error("База данных не настроена");
    const result = await database.pool.query(
      "SELECT id, name, subtitle, description, platform, tags FROM metadata_profiles WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/profiles/custom", requireAuth, async (req, res) => {
  try {
    if (!database.pool) throw new Error("База данных не настроена");
    
    // Check user subscription and profile limits
    const client = await database.pool.connect();
    let isUnlimited = false;
    let currentProfilesCount = 0;
    try {
      const userRes = await client.query("SELECT subscription_end_date FROM public.user_credits WHERE user_id = $1", [req.user.id]);
      if (userRes.rowCount > 0) {
        const { subscription_end_date } = userRes.rows[0];
        isUnlimited = subscription_end_date && new Date(subscription_end_date) > new Date();
      }
      
      const countRes = await client.query("SELECT COUNT(*) FROM metadata_profiles WHERE user_id = $1", [req.user.id]);
      currentProfilesCount = parseInt(countRes.rows[0].count, 10);
    } finally {
      client.release();
    }
    
    if (!isUnlimited && currentProfilesCount >= 1) {
      return res.status(403).json({ error: "В бесплатном тарифе можно иметь только 1 активный профиль. Перейдите на Unlimited.", code: "LIMIT_REACHED" });
    }

    const raw = JSON.stringify(req.body);
    const profile = validateCustomProfile(raw);
    const result = await database.pool.query(
      `INSERT INTO metadata_profiles (user_id, name, subtitle, description, tags)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, subtitle, description, tags`,
      [req.user.id, profile.name, profile.subtitle, profile.description, JSON.stringify(profile.tags)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/profiles/custom/:id", requireAuth, async (req, res) => {
  try {
    if (!database.pool) throw new Error("База данных не настроена");
    await database.pool.query(
      "DELETE FROM metadata_profiles WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.use("/payments", require("./payments")(database.pool, requireAuth));

module.exports = router;
