/**
 * Sunucu tarafinda (generateMetadata vb.) public API cagrilarinda kullanilir.
 * `NEXT_PUBLIC_API_URL` yoksa yalnizca gelistirme ortaminda localhost denenir.
 */
export function getServerApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) {
    return raw.replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:8000/api";
  }
  return "";
}

export async function fetchPublicJson<T>(path: string): Promise<T | null> {
  const base = getServerApiBaseUrl();
  if (!base) {
    return null;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${base}${normalized}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 120 },
      signal: controller.signal,
    });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
