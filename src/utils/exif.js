// @ts-check
const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const { runCommand } = require("./exec");
const { variedTags, isCameraProfile, isIphoneProfile } = require("./profile");
const { exifDate, iptcTime, offsetString, pad, gpsDate, gpsTime, iptcDate } = require("./date");

const EXIFTOOL_BIN = process.env.EXIFTOOL_BIN || "exiftool";
const FFMPEG_BIN = process.env.FFMPEG_BIN || "ffmpeg";

function readableFile(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Возвращает первый читаемый ICC-профиль из списка кандидатов.
 * Приоритет: env-переменная → системный профиль macOS → профиль из репозитория (CC0).
 * @param {(string | undefined)[]} candidates
 * @returns {string} Путь к профилю или пустая строка
 */
function resolveIccProfile(candidates) {
  for (const candidate of candidates) {
    if (candidate && readableFile(candidate)) return candidate;
  }
  return "";
}

const P3_PROFILE = resolveIccProfile([
  process.env.P3_PROFILE,
  "/System/Library/ColorSync/Profiles/Display P3.icc",
  path.join(__dirname, "../../assets/icc/DisplayP3.icc")
]);
const SRGB_PROFILE = resolveIccProfile([
  process.env.SRGB_PROFILE,
  "/System/Library/ColorSync/Profiles/sRGB Profile.icc",
  path.join(__dirname, "../../assets/icc/sRGB.icc")
]);

/**
 * Применяет метаданные к фотографии с помощью ExifTool.
 * @param {string} filePath 
 * @param {import('./profile').Profile} profile 
 * @param {Date} captureDate 
 * @param {number} index 
 * @param {AbortSignal} [signal]
 */
async function runExifTool(filePath, profile, captureDate, index, signal) {
  // Таймзона локации профиля: настенное время и OffsetTime согласуются с GPS,
  // даже когда сервер работает в UTC (облако).
  const timeZone = profile.timeZone;
  const timestamp = exifDate(captureDate, timeZone);
  const offset = offsetString(captureDate, timeZone);
  const subseconds = pad(captureDate.getMilliseconds(), 3);
  let thumbnailPath = "";

  if (isCameraProfile(profile) && [".jpg", ".jpeg"].includes(path.extname(filePath).toLowerCase())) {
    const rebuiltPath = `${filePath}.rebuilt.jpg`;
    thumbnailPath = `${filePath}.thumbnail.jpg`;
    await runCommand(FFMPEG_BIN, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", filePath,
      "-frames:v", "1",
      "-q:v", "2",
      rebuiltPath
    ], { signal });
    await fs.promises.rename(rebuiltPath, filePath);
    await runCommand(FFMPEG_BIN, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", filePath,
      "-vf", "scale=320:-2",
      "-frames:v", "1",
      "-q:v", "5",
      thumbnailPath
    ], { signal });
  }

  const args = ["-overwrite_original", "-all="];
  for (const [tag, value] of Object.entries(variedTags(profile, index))) {
    args.push(`-${tag}=${value}`);
  }

  if (isCameraProfile(profile)) {
    args.push(
      `-EXIF:ModifyDate=${timestamp}`,
      `-EXIF:DateTimeOriginal=${timestamp}`,
      `-EXIF:CreateDate=${timestamp}`,
      `-EXIF:OffsetTime=${offset}`,
      `-EXIF:OffsetTimeOriginal=${offset}`,
      `-EXIF:OffsetTimeDigitized=${offset}`,
      `-EXIF:SubSecTime=${subseconds}`,
      `-EXIF:SubSecTimeOriginal=${subseconds}`,
      `-EXIF:SubSecTimeDigitized=${subseconds}`,
      `-EXIF:GPSDateStamp=${gpsDate(captureDate)}`,
      `-EXIF:GPSTimeStamp=${gpsTime(captureDate)}`,
      `-EXIF:GPSHPositioningError=${(10 + Math.random() * 15).toFixed(6)}`,
      `-EXIF:GPSSpeed=${(Math.random() * 2).toFixed(4)}`,
      `-EXIF:GPSSpeedRef=K`,
      `-EXIF:CompositeImage=2`,
      `-XMPToolkit=`,
      `-EXIF:ImageUniqueID=${crypto.randomBytes(16).toString("hex").toUpperCase()}`,
      "-EXIF:ComponentsConfiguration=1 2 3 0",
      "-EXIF:ExifImageWidth<File:ImageWidth",
      "-EXIF:ExifImageHeight<File:ImageHeight"
    );
    const colorProfile = isIphoneProfile(profile) ? P3_PROFILE : SRGB_PROFILE;
    if (colorProfile) {
      args.push(`-ICC_Profile<=${colorProfile}`);
      args.push(`-EXIF:ColorSpace=${isIphoneProfile(profile) ? "Uncalibrated" : "1"}`);
    }
    if (thumbnailPath) args.push(`-EXIF:ThumbnailImage<=${thumbnailPath}`);
  }
  args.push(filePath);
  try {
    await runCommand(EXIFTOOL_BIN, args, { signal });
  } finally {
    if (thumbnailPath) await fs.promises.rm(thumbnailPath, { force: true }).catch(() => {});
  }
}

module.exports = { runExifTool };
