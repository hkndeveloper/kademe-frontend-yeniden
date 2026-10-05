import type { Metadata } from "next";
export const metadata: Metadata = { title: "Blog — iki sütun" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
