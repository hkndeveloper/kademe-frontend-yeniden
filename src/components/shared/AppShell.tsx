"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PublicScrollTop, PublicSmoothScroll } from "@/components/public";
import { Header, isPanelPath } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const panel = isPanelPath(pathname);

  return (
    <>
      <Header />
      <main className={cn("flex-1", "pt-0")}>{children}</main>
      {!panel && <Footer />}
      {!panel && <PublicSmoothScroll />}
      {!panel && <PublicScrollTop />}
    </>
  );
}