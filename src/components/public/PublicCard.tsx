import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type PublicCardTone = "default" | "soft" | "dark" | "outline" | "gradient";

const toneClasses: Record<PublicCardTone, string> = {
  default: "kdm-public-card bg-white text-[#09090b]",
  soft: "kdm-public-card bg-[#f9f9f9] text-[#09090b]",
  dark: "kdm-public-card-dark text-white",
  outline:
    "kdm-public-card-outline rounded-[1.75rem] border-2 border-[#e4e4e7] bg-transparent text-[#09090b]",
  gradient:
    "kdm-public-card bg-gradient-to-br from-white via-[#fff8f7] to-[#fef3f2] text-[#09090b]",
};

export type PublicCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  interactive?: boolean;
  tone?: PublicCardTone;
};

export function PublicCard({
  children,
  className,
  interactive = false,
  tone = "default",
  ...props
}: PublicCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-[1.75rem] border p-5 transition-[transform,border-color,box-shadow,background-color] duration-300 sm:p-6",
        toneClasses[tone],
        interactive && "kdm-public-card-interactive cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function PublicBadge({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("kdm-public-heading-sub", className)} {...props}>
      {children}
    </span>
  );
}

export function PublicIconBadge({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("kdm-public-icon-badge h-14 w-14 rounded-2xl", className)} {...props}>
      {children}
    </div>
  );
}

export function PublicGradientTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("kdm-public-gradient-text", className)} {...props}>
      {children}
    </span>
  );
}