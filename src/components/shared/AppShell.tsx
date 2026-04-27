"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Header, isPanelPath } from "@/components/shared/Header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const panel = isPanelPath(pathname);

  return (
    <>
      <Header />
      <main className={cn("flex-1", panel ? "pt-0" : "pt-20")}>{children}</main>
    </>
  );
}
