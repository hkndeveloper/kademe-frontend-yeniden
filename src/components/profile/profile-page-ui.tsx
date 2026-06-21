"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CheckCircle, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Ortak form alani — panel icerik / ayarlar ile uyumlu acik tema */
export const profileInputClass =
  "w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

export function ProfileFieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      {hint ? <p className="mb-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

const heroAccents: Record<string, { iconWrap: string; title: string }> = {
  amber: { iconWrap: "bg-amber-500 text-white shadow-md shadow-amber-500/25", title: "text-slate-900" },
  purple: { iconWrap: "bg-purple-600 text-white shadow-md shadow-purple-600/25", title: "text-slate-900" },
  orange: { iconWrap: "bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/30", title: "text-slate-900" },
  slate: { iconWrap: "bg-slate-800 text-white shadow-md shadow-slate-800/25", title: "text-slate-900" },
};

export function ProfileHero({
  title,
  subtitle,
  icon: Icon,
  accent = "slate",
  actions,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent?: keyof typeof heroAccents;
  actions?: ReactNode;
}) {
  const a = heroAccents[accent] ?? heroAccents.slate;
  return (
    <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex items-start gap-4">
        <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl", a.iconWrap)}>
          <Icon className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <h1 className={cn("text-2xl font-bold tracking-tight", a.title)}>{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function ProfileCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm sm:p-6 md:p-8",
        className,
      )}
    >
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function ProfileVerificationPills({ tc, yok, yokLabel }: { tc: boolean; yok: boolean; yokLabel: string }) {
  return (
    <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
      <Pill label="TC" verified={tc} />
      <Pill label={yokLabel} verified={yok} />
    </div>
  );
}

function Pill({ label, verified }: { label: string; verified: boolean }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide",
        verified ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900",
      )}
    >
      {verified ? <CheckCircle className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
      {label} {verified ? "dogrulandi" : "bekliyor"}
    </div>
  );
}

export function ProfileLockedField({
  label,
  value,
  verified,
}: {
  label: string;
  value: string;
  verified: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/90 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <Lock className="h-4 w-4 text-slate-400" aria-hidden />
      </div>
      <div className="font-semibold text-slate-900">{value}</div>
      <p className={cn("mt-2 text-xs font-medium", verified ? "text-emerald-700" : "text-amber-800")}>
        {verified
          ? "Bu alan kullanici tarafindan degistirilemez (KVKK / dogrulama)."
          : "Entegrasyon tamamlandiginda sistem tarafindan dogrulanacak."}
      </p>
    </div>
  );
}

export type ProfileQuickLink = { href: string; label: string; description?: string; icon: LucideIcon };

export function ProfileQuickLinks({ items, title = "Ilgili moduller" }: { items: ProfileQuickLink[]; title?: string }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 transition hover:border-indigo-300 hover:bg-indigo-50/60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/80 group-hover:ring-indigo-200">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
                {item.description ? (
                  <span className="mt-0.5 block text-xs text-slate-500">{item.description}</span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function ProfileMessageBanner({ type, children }: { type: "success" | "error" | "neutral"; children: ReactNode }) {
  const styles =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : type === "error"
        ? "border-red-200 bg-red-50 text-red-900"
        : "border-slate-200 bg-slate-50 text-slate-700";
  return <div className={cn("rounded-xl border px-4 py-3 text-sm", styles)}>{children}</div>;
}
