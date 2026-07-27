"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

export function PublicScrollTop() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const nextProgress = scrollHeight > 0 ? Math.min(scrollTop / scrollHeight, 1) : 0;
      setVisible(scrollTop > 420);
      setProgress(nextProgress);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label="Yukarı çık"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "kdm-public-scroll-top fixed bottom-5 right-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_18px_46px_rgba(9,9,11,0.22)] transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd3a25]/35",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
      style={{ "--progress-angle": `${Math.round(progress * 360)}deg` } as CSSProperties}
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}