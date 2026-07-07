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
    <div className="panel-filter-card">
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1.4fr),repeat(5,minmax(0,1fr)),auto] lg:items-end">
        <label className="panel-field">
          <span className="panel-label">Arama</span>
          <div className="relative min-w-0">
            <Search className="panel-control-icon" />
            <input
              value={filters.search}
              onChange={(event) => onChange({ search: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") onApply();
              }}
              className="panel-control pl-10"
              placeholder="Aciklama, yol, permission veya request id ara"
            />
          </div>
        </label>
        <label className="panel-field">
          <span className="panel-label">Kaynak</span>
          <select value={filters.log_name} onChange={(event) => onChange({ log_name: event.target.value })} className="panel-control">
            <option value="">Tum kaynaklar</option>
            {options.log_names.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label className="panel-field">
          <span className="panel-label">Aksiyon</span>
          <select value={filters.event} onChange={(event) => onChange({ event: event.target.value })} className="panel-control">
            <option value="">Tum aksiyonlar</option>
            {options.events.map((event) => <option key={event} value={event}>{event}</option>)}
          </select>
        </label>
        <label className="panel-field">
          <span className="panel-label">Sonuc</span>
          <select value={filters.outcome} onChange={(event) => onChange({ outcome: event.target.value })} className="panel-control">
            <option value="">Tum sonuclar</option>
            <option value="success">Basarili</option>
            <option value="denied_or_failed">Hata / red</option>
          </select>
        </label>
        <label className="panel-field">
          <span className="panel-label">Baslangic</span>
          <input type="date" value={filters.date_from} onChange={(event) => onChange({ date_from: event.target.value })} className="panel-control" />
        </label>
        <label className="panel-field">
          <span className="panel-label">Bitis</span>
          <input type="date" value={filters.date_to} onChange={(event) => onChange({ date_to: event.target.value })} className="panel-control" />
        </label>
        <button type="button" onClick={onApply} disabled={loading} className="panel-button panel-button-primary">
          <Filter className="h-4 w-4" /> Uygula
        </button>
      </div>
    </div>
  );
}