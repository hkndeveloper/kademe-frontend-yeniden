import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Blog", template: "%s | KADEME" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
