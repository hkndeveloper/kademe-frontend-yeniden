import { Filter, Search } from "lucide-react";
import type { LogFilterOptions, LogFilters } from "../types";

type Props = {
  filters: LogFilters;
  options: LogFilterOptions;
  loading: boolean;
  onChange: (patch: Partial<LogFilters>) => void;
  onApply: () => void;
};

export function LogFiltersBar({ filters, options, loading, onChange, onApply }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1.4fr,repeat(5,minmax(0,1fr)),auto]">
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter") onApply();
            }}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
            placeholder="Aciklama, yol, permission veya request id ara"
          />
        </div>
        <select value={filters.log_name} onChange={(event) => onChange({ log_name: event.target.value })} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500">
          <option value="">Tum kaynaklar</option>
          {options.log_names.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select value={filters.event} onChange={(event) => onChange({ event: event.target.value })} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500">
          <option value="">Tum aksiyonlar</option>
          {options.events.map((event) => <option key={event} value={event}>{event}</option>)}
        </select>
        <select value={filters.outcome} onChange={(event) => onChange({ outcome: event.target.value })} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500">
          <option value="">Tum sonuclar</option>
          <option value="success">Basarili</option>
          <option value="denied_or_failed">Hata / red</option>
        </select>
        <input type="date" value={filters.date_from} onChange={(event) => onChange({ date_from: event.target.value })} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500" />
        <input type="date" value={filters.date_to} onChange={(event) => onChange({ date_to: event.target.value })} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500" />
        <button type="button" onClick={onApply} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
          <Filter className="h-4 w-4" /> Uygula
        </button>
      </div>
    </div>
  );
}