import type { Metadata } from "next";
import ThemePreview from "./ThemePreview";

export const metadata: Metadata = {
  title: "Yeni Ana Sayfa Önizlemesi",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ThemePreview />;
}
