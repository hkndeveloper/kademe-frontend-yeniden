import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Projeler", template: "%s | KADEME" },
  description: "KADEME aktif projeleri, başvuru durumu, program takvimi ve proje detayları.",
  openGraph: {
    title: "KADEME Projeler",
    description: "Aktif projeler ve başvuru bilgileri.",
  },
};

export default function ProjectsSectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
