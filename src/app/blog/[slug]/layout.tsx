import type { Metadata } from "next";
import { fetchPublicJson } from "@/lib/server-api-base";

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchPublicJson<{ blog?: { title?: string } }>(
    `/blogs/${encodeURIComponent(slug)}`,
  );
  return { title: data?.blog?.title?.trim() || "Blog Yazısı" };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

