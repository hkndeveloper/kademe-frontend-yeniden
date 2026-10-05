import type { Metadata } from "next";
export const metadata: Metadata = { title: "Blog — standart görünüm" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
