import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type PublicSectionTone = "default" | "muted" | "dark" | "white";

const toneClasses: Record<PublicSectionTone, string> = {
  default: "bg-transparent",
  muted: "bg-[#edecec]",
  dark: "text-white",
  white: "bg-[#fafafa]",
};

const toneBg: Record<PublicSectionTone, string> = {
  default: "",
  muted: "",
  dark: "linear-gradient(0deg, #18181B, #18181B)",
  white: "",
};

export type PublicSectionProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  containerClassName?: string;
  tone?: PublicSectionTone;
};

export function PublicSection({ children, className, containerClassName, tone = "default", ...props }: PublicSectionProps) {
  return (
    <section
      className={cn("kdm-public-flat-spacing relative overflow-hidden", toneClasses[tone], className)}
      style={toneBg[tone] ? { background: toneBg[tone] } : undefined}
      {...props}
    >
      <div className={cn("container relative z-10 mx-auto px-4 sm:px-6", containerClassName)}>{children}</div>
    </section>
  );
}

export type PublicSectionHeaderProps = HTMLAttributes<HTMLDivElement> & {
  align?: "left" | "center";
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
};

/** heading-section karşılığı — aigocy .heading-section .heading-sub + .heading-title */
export function PublicSectionHeader({
  align = "left",
  className,
  description,
  eyebrow,
  title,
  ...props
}: PublicSectionHeaderProps) {
  return (
    <div
      className={cn(
        "kdm-public-section-heading max-w-3xl",
        align === "center" && "center mx-auto",
        className,
      )}
      {...props}
    >
      {eyebrow ? (
        <div className={cn(align === "center" && "flex justify-center")}>
          {/* heading-sub stili */}
          <span className="kdm-public-heading-sub">
            {eyebrow}
          </span>
        </div>
      ) : null}
      {/* heading-title stili — 72px, letter-spacing: -0.03em */}
      <h2 className="kdm-public-heading-title text-balance">{title}</h2>
      {description ? (
        <p className="mt-6 text-pretty text-base leading-7 text-[#52525b] sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}

