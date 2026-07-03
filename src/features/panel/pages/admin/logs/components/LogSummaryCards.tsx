import { ActivitySquare, CheckCircle2, Database, XCircle } from "lucide-react";
import type { LogSummary } from "../types";

type Props = {
  summary?: LogSummary | null;
};

export function LogSummaryCards({ summary }: Props) {
  const cards = [
    { label: "Filtreli toplam", value: summary?.total ?? 0, icon: ActivitySquare, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Basarili", value: summary?.success ?? 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Hata / red", value: summary?.failed ?? 0, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Kaynak", value: Object.keys(summary?.sources ?? {}).length, icon: Database, color: "text-slate-600", bg: "bg-slate-100" },
  ];

  return (
    <section className="grid gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{card.value}</p>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg} ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}