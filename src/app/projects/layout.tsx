import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projeler",
  description: "KADEME aktif projeleri, basvuru durumu, program takvimi ve proje detaylari.",
  openGraph: {
    title: "KADEME Projeler",
    description: "Aktif projeler ve basvuru bilgileri.",
  },
};

export default function ProjectsSectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
