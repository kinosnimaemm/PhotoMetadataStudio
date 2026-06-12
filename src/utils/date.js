// @ts-check

/**
 * Дополняет число нулями спереди до указанной длины.
 * @param {number|string} value Значение
 * @param {number} [length=2] Желаемая длина (по умолчанию 2)
 * @returns {string} Строка с ведущими нулями
 */
function pad(value, length = 2) {
  return String(value).padStart(length, "0");
}

/**
 * Возвращает дату для тегов EXIF.
 * @param {Date} date 
 * @returns {string} Например: "2026:06:12 14:00:00"
 */
function exifDate(date) {
  return `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Возвращает дату для тегов IPTC.
 * @param {Date} date 
 * @returns {string} Например: "2026:06:12"
 */
function iptcDate(date) {
  return `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())}`;
}

/**
 * Возвращает время со смещением часового пояса для тегов IPTC и EXIF.
 * @param {Date} date 
 * @returns {string} Например: "14:00:00+02:00"
 */
function iptcTime(date) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const hours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
  const minutes = pad(Math.abs(offsetMinutes) % 60);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${hours}:${minutes}`;
}

/**
 * Возвращает UTC дату для GPS.
 * @param {Date} date 
 * @returns {string} Например: "2026:06:12"
 */
function gpsDate(date) {
  return `${date.getUTCFullYear()}:${pad(date.getUTCMonth() + 1)}:${pad(date.getUTCDate())}`;
}

/**
 * Возвращает UTC время для GPS.
 * @param {Date} date 
 * @returns {string} Например: "12:00:00"
 */
function gpsTime(date) {
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

module.exports = {
  pad,
  exifDate,
  iptcDate,
  iptcTime,
  gpsDate,
  gpsTime
};
