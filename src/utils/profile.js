// @ts-check
const crypto = require("node:crypto");
const path = require("node:path");
const { isValidTimeZone } = require("./date");

/**
 * @typedef {Object} Profile
 * @property {string} id
 * @property {string} name
 * @property {string} [subtitle]
 * @property {string} [description]
 * @property {string} [timeZone] IANA-таймзона локации профиля (например "America/New_York")
 * @property {Record<string, string>} tags
 */

/**
 * Проверяет, является ли профиль профилем камеры (Apple, Google и тд).
 * @param {Profile} profile 
 * @returns {boolean}
 */
function isCameraProfile(profile) {
  return Boolean(profile?.tags?.["EXIF:Make"] && profile?.tags?.["EXIF:Model"]);
}

/**
 * Проверяет, является ли профиль профилем iPhone.
 * @param {Profile} profile 
 * @returns {boolean}
 */
function isIphoneProfile(profile) {
  return profile?.tags?.["EXIF:Make"] === "Apple";
}

/**
 * Делает имя файла безопасным.
 * @param {string} name 
 * @returns {string}
 */
function safeName(name) {
  return path.basename(name || "photo.jpg").replace(/[^\p{L}\p{N}._ -]/gu, "_");
}

/**
 * Варьирует некоторые теги (ISO, выдержка) для создания отличий между снимками.
 * @param {Profile} profile 
 * @param {number} index Индекс фотографии в партии
 * @returns {Record<string, string>}
 */
function variedTags(profile, index) {
  const tags = { ...profile.tags };
  if (!isCameraProfile(profile)) return tags;
  
  const isoBase = Number(tags["EXIF:ISO"] || 100);
  const isoPattern = [0, 16, -8, 24, 8, -16, 32, 4, 20, -4];
  
  const exposureMatch = String(tags["EXIF:ExposureTime"] || "1/100").match(/^1\/(\d+)$/);
  const exposureBase = exposureMatch ? Number(exposureMatch[1]) : 100;
  const exposureFactors = [1, 1.2, 0.8, 1.25, 0.96, 1.1, 0.9, 1.28, 1.05, 0.85];
  
  const directionBase = Number(tags["EXIF:GPSImgDirection"] || 315);
  
  tags["EXIF:ISO"] = String(Math.max(25, isoBase + (isoPattern[index] || 0)));
  tags["EXIF:ExposureTime"] = `1/${Math.max(1, Math.round(exposureBase * (exposureFactors[index] || 1)))}`;
  tags["EXIF:GPSImgDirection"] = String((directionBase + index * 7) % 360);
  
  if (tags["EXIF:GPSLatitude"] && tags["EXIF:GPSLongitude"]) {
    // Dynamic AI: random geo offset within ~20km radius (0.18 degrees)
    const latBase = Number(tags["EXIF:GPSLatitude"]);
    const lonBase = Number(tags["EXIF:GPSLongitude"]);
    const latOffset = (Math.random() * 0.36 - 0.18);
    const lonOffset = (Math.random() * 0.36 - 0.18);
    
    tags["EXIF:GPSLatitude"] = Math.max(0, latBase + latOffset).toFixed(6);
    tags["EXIF:GPSLongitude"] = Math.max(0, lonBase + lonOffset).toFixed(6);
  }
  
  return tags;
}

/**
 * Валидирует и парсит кастомный профиль.
 * @param {string} raw JSON строка
 * @returns {Profile}
 */
function validateCustomProfile(raw) {
  const data = JSON.parse(raw);
  if (!data || typeof data !== "object" || typeof data.name !== "string" || typeof data.tags !== "object") {
    throw new Error("Некорректный пользовательский пресет.");
  }
  const allowedTag = /^(EXIF|IPTC|XMP-[\w]+):[\w-]+#?$/;
  const tags = {};
  for (const [tag, value] of Object.entries(data.tags).slice(0, 80)) {
    if (allowedTag.test(tag) && ["string", "number"].includes(typeof value)) tags[tag] = String(value);
  }
  return {
    id: `custom-camera-${crypto.randomUUID()}`,
    name: safeName(data.name).slice(0, 80),
    subtitle: "Пользовательский пресет",
    description: "Локально созданный синтетический профиль.",
    ...(isValidTimeZone(data.timeZone) ? { timeZone: data.timeZone } : {}),
    tags
  };
}

/**
 * Генерирует имя на выходе.
 * @param {string} originalName 
 * @param {string} namingMode 
 * @param {string} customName 
 * @param {number} index 
 * @param {number} startNumber 
 * @returns {string}
 */
function outputName(originalName, namingMode, customName, index, startNumber) {
  const extension = path.extname(originalName);
  if (namingMode === "iphone") {
    const number = ((startNumber - 1 + index) % 9999 + 1).toString().padStart(4, "0");
    return `IMG_${number}${extension.toUpperCase()}`;
  }
  if (namingMode === "custom") {
    const requested = safeName(customName).replace(/\.[^.]+$/, "").trim();
    if (!requested) throw new Error("Введи новое имя фотографий.");
    const suffix = index > 0 ? ` ${String(index + 1).padStart(2, "0")}` : "";
    return `${requested}${suffix}${extension}`;
  }
  return originalName;
}

module.exports = {
  isCameraProfile,
  isIphoneProfile,
  safeName,
  variedTags,
  validateCustomProfile,
  outputName
};
