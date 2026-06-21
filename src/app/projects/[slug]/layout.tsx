import type { Metadata } from "next";
import { fetchPublicJson } from "@/lib/server-api-base";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchPublicJson<{
    project?: { name: string; short_description?: string | null; cover_image?: string | null };
  }>(`/projects/${encodeURIComponent(slug)}`);

  const project = data?.project;
  if (!project) {
    return { title: "Proje" };
  }

  const description =
    (project.short_description && project.short_description.trim()) ||
    `${project.name} — KADEME proje sayfasi, programlar ve basvuru bilgileri.`;

  const ogImages = project.cover_image ? [{ url: project.cover_image }] : undefined;

  return {
    title: project.name,
    description: description.slice(0, 200),
    openGraph: {
      title: project.name,
      description: description.slice(0, 200),
      type: "website",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: project.name,
      description: description.slice(0, 200),
      images: project.cover_image ? [project.cover_image] : undefined,
    },
  };
}

export default function ProjectSlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
