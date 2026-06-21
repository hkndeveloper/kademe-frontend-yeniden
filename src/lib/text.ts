const WINDOWS_1252_BYTES: Record<string, number> = {
  "€": 0x80,
  "‚": 0x82,
  "ƒ": 0x83,
  "„": 0x84,
  "…": 0x85,
  "†": 0x86,
  "‡": 0x87,
  "ˆ": 0x88,
  "‰": 0x89,
  "Š": 0x8a,
  "‹": 0x8b,
  "Œ": 0x8c,
  "Ž": 0x8e,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "˜": 0x98,
  "™": 0x99,
  "š": 0x9a,
  "›": 0x9b,
  "œ": 0x9c,
  "ž": 0x9e,
  "Ÿ": 0x9f,
};

const MOJIBAKE_PATTERN = /[ÃÂâÄÅÆ�]/;
const MOJIBAKE_SCORE_PATTERN = /[ÃÂâÄÅÆ�]/g;

const mojibakeScore = (value: string) => value.match(MOJIBAKE_SCORE_PATTERN)?.length ?? 0;

const encodeWindows1252 = (value: string) =>
  Uint8Array.from(Array.from(value), (character) => {
    const mapped = WINDOWS_1252_BYTES[character];
    if (mapped !== undefined) return mapped;
    return character.charCodeAt(0) & 0xff;
  });

export const fixMojibake = (value?: string | null) => {
  if (typeof value !== "string" || value.length === 0 || !MOJIBAKE_PATTERN.test(value)) {
    return value ?? "";
  }

  const decoder = new TextDecoder("utf-8", { fatal: false });
  let current = value;

  for (let index = 0; index < 6; index += 1) {
    const score = mojibakeScore(current);
    if (score === 0) break;

    const decoded = decoder.decode(encodeWindows1252(current));
    const decodedScore = mojibakeScore(decoded);

    if (!decoded || decoded === current || decoded.includes("�") || decodedScore > score) {
      break;
    }

    current = decoded;
  }

  return current;
};