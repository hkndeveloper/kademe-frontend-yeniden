import type { Metadata } from "next";
export const metadata: Metadata = { title: "Blog — üç sütun" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
