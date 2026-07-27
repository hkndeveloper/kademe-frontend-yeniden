import Link from "next/link";
import { type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type PublicButtonVariant = "primary" | "secondary" | "dark" | "ghost" | "outline";
type PublicButtonSize = "sm" | "md" | "lg";


const variantClasses: Record<PublicButtonVariant, string> = {
  primary:
    "kdm-public-btn-brand text-white hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(253,58,37,0.38)]",
  secondary:
    "kdm-public-btn-light border border-white/80 text-[#09090b] hover:-translate-y-0.5 hover:text-[#fd3a25] hover:border-[#fd3a25]/30",
  dark:
    "kdm-public-btn-dark text-white hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(9,9,11,0.36)]",
  ghost:
    "text-[#52525b] hover:bg-[#f4f4f5] hover:text-[#09090b]",
  outline:
    "border-2 border-[#fd3a25]/40 bg-transparent text-[#fd3a25] hover:-translate-y-0.5 hover:border-[#fd3a25] hover:bg-[#fd3a25]/05",
};

const sizeClasses: Record<PublicButtonSize, string> = {
  sm: "h-12 rounded-full px-5 text-sm",
  md: "h-14 rounded-full px-7 text-base",
  lg: "h-16 rounded-full px-9 text-base",
};

const baseClasses =
  "kdm-public-btn-shine kdm-public-button-micro inline-flex max-w-full items-center justify-center gap-2.5 whitespace-nowrap font-semibold tracking-[-0.01em] transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd3a25]/30 disabled:pointer-events-none disabled:opacity-60";

type SharedProps = {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  size?: PublicButtonSize;
  variant?: PublicButtonVariant;
};

type LinkButtonProps = SharedProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> & {
    href: string;
  };

type NativeButtonProps = SharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
    href?: never;
  };

export type PublicButtonProps = LinkButtonProps | NativeButtonProps;

export function PublicButton({
  children,
  className,
  icon,
  iconPosition = "right",
  size = "md",
  variant = "primary",
  ...props
}: PublicButtonProps) {
  const content = (
    <>
      {icon && iconPosition === "left" ? <span className="kdm-public-btn-icon shrink-0">{icon}</span> : null}
      <span className="relative z-[1] truncate">{children}</span>
      {icon && iconPosition === "right" ? <span className="kdm-public-btn-icon shrink-0">{icon}</span> : null}
    </>
  );
  const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], className);

  if ("href" in props) {
    const { href, ...linkProps } = props as LinkButtonProps;
    return (
      <Link href={href} className={classes} {...linkProps}>
        {content}
      </Link>
    );
  }

  const buttonProps = props as NativeButtonProps;

  return (
    <button className={classes} {...buttonProps}>
      {content}
    </button>
  );
}