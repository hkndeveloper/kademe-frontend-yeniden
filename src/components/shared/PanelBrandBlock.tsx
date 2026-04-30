import Link from "next/link";

export function PanelBrandBlock({ roleLabel }: { roleLabel: string }) {
  return (
    <div className="border-b border-white/[0.08] px-4 py-4">
      <Link
        href="/"
        className="inline-flex outline-none transition-opacity duration-300 hover:opacity-90 active:scale-95 ring-offset-slate-900 focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
        title="Ana sayfaya don"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/branding/kademe-logo-beyaz.svg"
          alt="KADEME"
          className="h-9 w-auto"
          width={120}
          height={36}
        />
      </Link>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{roleLabel}</p>
    </div>
  );
}
