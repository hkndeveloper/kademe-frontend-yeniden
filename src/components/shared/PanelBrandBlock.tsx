import Link from "next/link";

export function PanelBrandBlock({ roleLabel }: { roleLabel: string }) {
  return (
    <div className="border-b border-white/[0.08] px-3 py-4">
      <Link
        href="/"
        className="flex w-full items-center justify-center outline-none transition-opacity duration-300 hover:opacity-90 active:scale-95 ring-offset-slate-900 focus-visible:ring-2 focus-visible:ring-[#FF6B00] group-hover/sidebar:justify-start group-focus-within/sidebar:justify-start"
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
      <p className="mt-3 h-4 overflow-hidden text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
        {roleLabel}
      </p>
    </div>
  );
}
