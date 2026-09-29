import type { Metadata } from "next";
import { fetchPublicJson } from "@/lib/server-api-base";

export async function generateMetadata({
  params,
}: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchPublicJson<{ program?: { title?: string } }>(
    `/activities/${encodeURIComponent(id)}`,
  );
  return { title: data?.program?.title?.trim() || "Faaliyet" };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

