import Link from "next/link";

export function PanelBrandBlock({ roleLabel }: { roleLabel: string }) {
  return (
    <div className="border-b border-white/[0.08] px-4 py-5">
      <Link href="/" className="flex flex-col items-start gap-0.5 outline-none ring-offset-[#0a0b14] focus-visible:ring-2 focus-visible:ring-[#FF6B00]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/branding/kademe-logo-beyaz.svg"
          alt="KADEME"
          className="h-9 w-auto"
          width={120}
          height={36}
        />
        <span className="text-sm font-bold tracking-tight text-white">KADEME</span>
      </Link>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{roleLabel}</p>
    </div>
  );
}
