import axios from "axios";

export function panelLoadErrorMessage(error: unknown, resourceLabel: string): string {
  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return `${resourceLabel} için bu birimde görüntüleme yetkiniz bulunmuyor.`;
  }
  if (axios.isAxiosError(error) && error.response?.status === 404) {
    return `${resourceLabel} bulunamadı veya artık erişilebilir değil.`;
  }
  return `${resourceLabel} yüklenemedi. Bağlantıyı kontrol edip tekrar deneyin.`;
}

export async function optionalPanelRequest<T, F>(
  request: Promise<T>,
  fallback: F,
  label: string,
): Promise<T | F> {
  try {
    return await request;
  } catch (error) {
    console.warn(`${label} yüklenemedi; ana ekran verisi korunuyor.`, error);
    return fallback;
  }
}
