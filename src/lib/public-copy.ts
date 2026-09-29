import { defaultSiteSettings } from "./site-config";

// Compatibility with ASCII seed copy still returned by older public APIs.
// Match entire known defaults only: never transliterate arbitrary editorial content,
// URLs, project names, verification codes, or object keys.
const fold = (value: string) => value
  .normalize("NFC")
  .replace(/[çÇğĞıİöÖşŞüÜ]/g, (letter) => ({
    ç: "c", Ç: "C", ğ: "g", Ğ: "G", ı: "i", İ: "I",
    ö: "o", Ö: "O", ş: "s", Ş: "S", ü: "u", Ü: "U",
  })[letter]!)
  .toLowerCase();

const knownCopy = new Map<string, string>();
function collect(value: unknown): void {
  if (typeof value === "string" && /[çğıİöşüÇĞÖŞÜ]/.test(value)) {
    knownCopy.set(fold(value), value);
  } else if (Array.isArray(value)) {
    value.forEach(collect);
  } else if (value && typeof value === "object") {
    Object.values(value).forEach(collect);
  }
}
collect(defaultSiteSettings);
["Aktif Öğrenci", "Yaklaşan Faaliyet", "Yayınlanan Blog", "Gelişim Yolculuğu"].forEach(collect);

export function normalizeKnownPublicCopy<T>(value: T): T {
  if (typeof value === "string") {
    const corrected = knownCopy.get(fold(value));
    if (!corrected) return value;
    const originalWords = value.match(/[\p{L}]+/gu) ?? [];
    let index = 0;
    return corrected.replace(/[\p{L}]+/gu, (word) => {
      const original = originalWords[index++] ?? word;
      if (original === original.toUpperCase()) return word.toLocaleUpperCase("tr-TR");
      const lower = word.toLocaleLowerCase("tr-TR");
      return original[0] === original[0].toUpperCase()
        ? lower[0].toLocaleUpperCase("tr-TR") + lower.slice(1)
        : lower;
    }) as T;
  }
  if (Array.isArray(value)) return value.map(normalizeKnownPublicCopy) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key, /(?:href|url|slug|code|id)$/.test(key) ? item : normalizeKnownPublicCopy(item),
    ])) as T;
  }
  return value;
}
