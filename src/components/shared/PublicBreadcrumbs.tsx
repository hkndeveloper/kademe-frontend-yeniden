import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  items: BreadcrumbItem[];
  className?: string;
  /** Hero uzerindeki gibi koyu arka planlarda okunakli renkler */
  variant?: "default" | "onDark";
}

export function PublicBreadcrumbs({ items, className = "", variant = "default" }: Props) {
  if (items.length === 0) {
    return null;
  }

  const linkClass =
    variant === "onDark"
      ? "font-medium text-slate-100/90 transition-colors hover:text-white"
      : "font-medium text-foreground/80 transition-colors hover:text-primary";
  const currentClass = variant === "onDark" ? "font-semibold text-white" : "font-semibold text-foreground";
  const chevronClass = variant === "onDark" ? "h-3.5 w-3.5 shrink-0 text-slate-300/80" : "h-3.5 w-3.5 shrink-0 opacity-60";

  return (
    <nav aria-label="Sayfa konumu" className={`text-sm ${variant === "onDark" ? "text-slate-200" : "text-muted-foreground"} ${className}`}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? <ChevronRight className={chevronClass} aria-hidden /> : null}
              {item.href && !isLast ? (
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? currentClass : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
