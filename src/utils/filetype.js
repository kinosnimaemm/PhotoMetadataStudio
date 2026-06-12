// @ts-check
const fs = require("node:fs");

/**
 * Проверка магических байтов загруженных файлов.
 * Расширение легко подделать, а ExifTool/FFmpeg — парсеры с историей CVE,
 * поэтому скармливаем им только файлы с корректной сигнатурой изображения.
 */

const HEIC_BRANDS = new Set([
  "heic", "heix", "heim", "heis",
  "hevc", "hevx", "hevm", "hevs",
  "mif1", "msf1", "avif", "avis"
]);

/**
 * Определяет тип изображения по первым байтам файла.
 * @param {Buffer} head Первые байты файла (достаточно 16)
 * @returns {"jpg" | "png" | "tiff" | "webp" | "heic" | null}
 */
function sniffImageType(head) {
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "jpg";
  if (head.length >= 8 && head.readUInt32BE(0) === 0x89504e47 && head.readUInt32BE(4) === 0x0d0a1a0a) return "png";
  if (head.length >= 4) {
    const tiffLE = head[0] === 0x49 && head[1] === 0x49 && head[2] === 0x2a && head[3] === 0x00;
    const tiffBE = head[0] === 0x4d && head[1] === 0x4d && head[2] === 0x00 && head[3] === 0x2a;
    if (tiffLE || tiffBE) return "tiff";
  }
  if (head.length >= 12 && head.toString("ascii", 0, 4) === "RIFF" && head.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (head.length >= 12 && head.toString("ascii", 4, 8) === "ftyp") {
    const brand = head.toString("ascii", 8, 12).toLowerCase();
    if (HEIC_BRANDS.has(brand)) return "heic";
  }
  return null;
}

/**
 * Читает начало файла и определяет тип изображения.
 * @param {string} filePath Путь к файлу
 * @returns {Promise<"jpg" | "png" | "tiff" | "webp" | "heic" | null>}
 */
async function sniffImageFile(filePath) {
  const handle = await fs.promises.open(filePath, "r");
  try {
    const head = Buffer.alloc(16);
    const { bytesRead } = await handle.read(head, 0, 16, 0);
    return sniffImageType(head.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
}

module.exports = { sniffImageType, sniffImageFile };
