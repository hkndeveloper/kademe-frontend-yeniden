export const ISTANBUL_TIME_ZONE = "Europe/Istanbul";

type DateTimeParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
};

function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime());
}

function istanbulParts(value: string | Date): DateTimeParts | null {
  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISTANBUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

export function toIstanbulDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const parts = istanbulParts(value);
  if (!parts) return "";
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function withIstanbulOffset(value?: string | null) {
  if (!value) return null;
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(value)) return value;
  return `${value.length === 16 ? `${value}:00` : value}+03:00`;
}

export function formatIstanbulDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) return "-";
  return date.toLocaleString("tr-TR", {
    timeZone: ISTANBUL_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatIstanbulDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) return "-";
  return date.toLocaleDateString("tr-TR", {
    timeZone: ISTANBUL_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatIstanbulTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) return "-";
  return date.toLocaleTimeString("tr-TR", {
    timeZone: ISTANBUL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function formatIstanbulWeekdayShort(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) return "-";
  return date.toLocaleDateString("tr-TR", {
    timeZone: ISTANBUL_TIME_ZONE,
    weekday: "short",
  });
}

export function formatIstanbulDayNumber(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (!isValidDate(date)) return "-";
  return date.toLocaleDateString("tr-TR", {
    timeZone: ISTANBUL_TIME_ZONE,
    day: "2-digit",
  });
}
