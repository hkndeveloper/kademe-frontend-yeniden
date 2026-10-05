"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PublicScrollTop, PublicSmoothScroll } from "@/components/public";
import { Header, isPanelPath } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { PublicHelpAssistant } from "@/components/public/PublicHelpAssistant";
import { ThemeHeader } from "@/components/aigocy/ThemeHeader";
import { ThemeFooter } from "@/components/aigocy/ThemeFooter";
import { ThemeMotion } from "@/components/aigocy/ThemeMotion";
import "@/components/aigocy/vendor.css";
import "@/components/aigocy/theme.css";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const panel = isPanelPath(pathname);
  const themePreview = pathname === "/tema-onizleme";

  return (
    <div className={!panel && !themePreview ? "aigocy-site" : "contents"}>
      {!themePreview && (panel ? <Header /> : <ThemeHeader />)}
      <main className={cn("flex-1", "pt-0")}>{children}</main>
      {!panel && (themePreview ? <Footer /> : <ThemeFooter />)}
      {!panel && <PublicSmoothScroll />}
      {!panel && !themePreview && <ThemeMotion />}
      {!panel && <PublicScrollTop />}
      {!panel && !themePreview && (
        <PublicHelpAssistant key={pathname} appearance="theme" />
      )}
    </div>
  );
}
