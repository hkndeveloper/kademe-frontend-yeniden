const extensionByContentType: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

type HeaderBag = Record<string, unknown>;

function headerValue(headers: HeaderBag, name: string): string {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return typeof value === "string" ? value : "";
}

function fileNameFromDisposition(disposition: string): string | null {
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1].replace(/"/g, ""));
  }

  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? null;
}

function safeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_");
}

export async function downloadBlobResponse(
  data: Blob,
  headers: HeaderBag,
  fallbackName: string,
): Promise<void> {
  const contentType = headerValue(headers, "content-type").split(";")[0];
  const blob = data instanceof Blob ? data : new Blob([data], { type: contentType || undefined });

  if (contentType === "application/json" || blob.type === "application/json") {
    const payload = JSON.parse(await blob.text()) as { download_url?: string; message?: string };
    if (payload.download_url) {
      window.open(payload.download_url, "_blank", "noopener,noreferrer");
      return;
    }

    throw new Error(payload.message ?? "Dosya indirilemedi.");
  }

  const dispositionName = fileNameFromDisposition(headerValue(headers, "content-disposition"));
  const extension = extensionByContentType[contentType] ?? "pdf";
  const fileName = dispositionName ?? `${safeFileName(fallbackName)}.${extension}`;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
