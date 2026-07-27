"use client";

import { ChevronDown } from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

export type PublicAccordionItem = {
  id: string;
  title: ReactNode;
  content: ReactNode;
};

type PublicAccordionProps = {
  className?: string;
  defaultOpenId?: string;
  items: PublicAccordionItem[];
};

export function PublicAccordion({ className, defaultOpenId, items }: PublicAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? items[0]?.id ?? null);

  return (
    <div className={cn("kdm-public-accordion space-y-3", className)}>
      {items.map((item) => {
        const isOpen = openId === item.id;

        return (
          <div
            key={item.id}
            className={cn(
              "kdm-public-accordion-item overflow-hidden rounded-[1.5rem] border bg-white transition-all duration-300",
              isOpen
                ? "is-open border-l-[3px] border-[#fd3a25]/30 bg-[rgba(253,58,37,0.01)] shadow-[0_8px_24px_rgba(253,58,37,0.08),0_2px_6px_rgba(9,9,11,0.06)]"
                : "border-[#d4d4d8]/80 shadow-[0_3px_3px_rgba(9,9,11,0.06),0_-2px_0_rgba(0,0,0,0.04)_inset,0_1px_0_rgba(255,255,255,0.7)_inset]",
            )}
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="kdm-public-accordion-trigger flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
              aria-expanded={isOpen}
            >
              <span className="font-semibold leading-6 text-[#09090b]">
                {item.title}
              </span>
              <span
                className={cn(
                  "kdm-public-accordion-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                  isOpen ? "is-open text-white" : "text-[#71717a]",
                )}
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isOpen && "rotate-180")} />
              </span>
            </button>
            {isOpen ? (
              <div className="border-t border-[#fd3a25]/10 px-5 pb-5 pt-3 text-sm leading-7 text-[#52525b] sm:px-6">
                {item.content}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export const PublicAccordicn = PublicAccordion;