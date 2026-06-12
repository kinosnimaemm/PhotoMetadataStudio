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
 * Возвращает компоненты даты (настенное время) в указанной IANA-таймзоне.
 * Без таймзоны — в локальной зоне сервера (прежнее поведение).
 * @param {Date} date
 * @param {string} [timeZone] Например "America/New_York"
 * @returns {{year: number, month: number, day: number, hour: number, minute: number, second: number}}
 */
function wallParts(date, timeZone) {
  if (!timeZone) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds()
    };
  }
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24, // Intl может вернуть "24" для полуночи
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}

/**
 * Смещение таймзоны в минутах для конкретного момента (учитывает DST).
 * @param {Date} date
 * @param {string} timeZone IANA-таймзона
 * @returns {number} Минуты смещения от UTC (положительные — восточнее)
 */
function tzOffsetMinutes(date, timeZone) {
  const parts = wallParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/**
 * Форматирует смещение таймзоны как "+02:00" / "-04:00".
 * @param {Date} date
 * @param {string} [timeZone] IANA-таймзона; без неё — зона сервера
 * @returns {string}
 */
function offsetString(date, timeZone) {
  const offsetMinutes = timeZone ? tzOffsetMinutes(date, timeZone) : -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const hours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
  const minutes = pad(Math.abs(offsetMinutes) % 60);
  return `${sign}${hours}:${minutes}`;
}

/**
 * Интерпретирует строку datetime-local ("2026-06-12T10:00") как настенное
 * время в указанной таймзоне и возвращает соответствующий момент времени.
 * Без таймзоны — прежнее поведение (зона сервера).
 * @param {string} value
 * @param {string} [timeZone] IANA-таймзона
 * @returns {Date | null}
 */
function parseWallTime(value, timeZone) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const [, year, month, day, hour, minute, second = "00"] = match;
  if (!timeZone) {
    const local = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    return Number.isNaN(local.getTime()) ? null : local;
  }
  // Двухшаговый расчёт: оценка смещения, затем уточнение (граница перехода DST).
  const guess = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  const firstOffset = tzOffsetMinutes(new Date(guess), timeZone);
  let utc = guess - firstOffset * 60000;
  const secondOffset = tzOffsetMinutes(new Date(utc), timeZone);
  if (secondOffset !== firstOffset) utc = guess - secondOffset * 60000;
  return new Date(utc);
}

/**
 * Проверяет, что строка — валидная IANA-таймзона.
 * @param {string} timeZone
 * @returns {boolean}
 */
function isValidTimeZone(timeZone) {
  if (typeof timeZone !== "string" || !timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Возвращает дату для тегов EXIF (настенное время в таймзоне профиля).
 * @param {Date} date
 * @param {string} [timeZone] IANA-таймзона
 * @returns {string} Например: "2026:06:12 14:00:00"
 */
function exifDate(date, timeZone) {
  const parts = wallParts(date, timeZone);
  return `${parts.year}:${pad(parts.month)}:${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
}

/**
 * Возвращает дату для тегов IPTC.
 * @param {Date} date
 * @param {string} [timeZone] IANA-таймзона
 * @returns {string} Например: "2026:06:12"
 */
function iptcDate(date, timeZone) {
  const parts = wallParts(date, timeZone);
  return `${parts.year}:${pad(parts.month)}:${pad(parts.day)}`;
}

/**
 * Возвращает время со смещением часового пояса для тегов IPTC и EXIF.
 * @param {Date} date
 * @param {string} [timeZone] IANA-таймзона
 * @returns {string} Например: "14:00:00+02:00"
 */
function iptcTime(date, timeZone) {
  const parts = wallParts(date, timeZone);
  return `${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}${offsetString(date, timeZone)}`;
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
  wallParts,
  tzOffsetMinutes,
  offsetString,
  parseWallTime,
  isValidTimeZone,
  exifDate,
  iptcDate,
  iptcTime,
  gpsDate,
  gpsTime
};
