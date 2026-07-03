"use client";

import { useCallback, useEffect, useState } from "react";
import { ActivitySquare } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import { LogFiltersBar } from "./components/LogFiltersBar";
import { LogSummaryCards } from "./components/LogSummaryCards";
import { LogTable } from "./components/LogTable";
import { exportableFilterParams, normalizeActivityRow } from "./log-utils";
import type { ActivityLog, LogFilterOptions, LogFilters, LogSummary, PaginatedLogs } from "./types";

type LogsApiResponse = {
  logs?: PaginatedLogs | { data?: Record<string, unknown>[] } | Record<string, unknown>[];
  summary?: LogSummary;
  filters?: LogFilterOptions;
  warning?: string;
};

const initialFilters: LogFilters = {
  search: "",
  log_name: "",
  event: "",
  outcome: "",
  status_code: "",
  date_from: "",
  date_to: "",
};

function normalizeLogsPayload(payload: LogsApiResponse["logs"]): PaginatedLogs {
  if (Array.isArray(payload)) {
    return {
      data: payload.map((item) => normalizeActivityRow(item)),
      current_page: 1,
      last_page: 1,
      total: payload.length,
    };
  }

  const rawRows = Array.isArray(payload?.data) ? payload.data : [];
  return {
    data: rawRows.map((item) => normalizeActivityRow(item)),
    current_page: Number((payload as PaginatedLogs | undefined)?.current_page ?? 1),
    last_page: Number((payload as PaginatedLogs | undefined)?.last_page ?? 1),
    total: Number((payload as PaginatedLogs | undefined)?.total ?? rawRows.length),
    per_page: Number((payload as PaginatedLogs | undefined)?.per_page ?? 25),
  };
}

export default function AdminLogsPage() {
  const { hasPermission } = usePermissions();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [summary, setSummary] = useState<LogSummary | null>(null);
  const [filterOptions, setFilterOptions] = useState<LogFilterOptions>({ log_names: [], events: [] });
  const [filters, setFilters] = useState<LogFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");

  const loadLogs = useCallback(async (pageNumber = page) => {
    if (!hasPermission("logs.view")) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setWarningMessage("");
    try {
      const response = await api.get<LogsApiResponse>("/panel/dashboard/activity-logs", {
        params: {
          ...exportableFilterParams(filters),
          page: pageNumber,
          per_page: 25,
        },
      });
      const payload = normalizeLogsPayload(response.data.logs);
      setLogs(payload.data);
      setPage(payload.current_page);
      setLastPage(payload.last_page);
      setTotal(payload.total);
      setSummary(response.data.summary ?? null);
      setFilterOptions(response.data.filters ?? { log_names: [], events: [] });
      if (typeof response.data.warning === "string") setWarningMessage(response.data.warning);
    } catch (error) {
      console.error("Loglar yuklenemedi", error);
      setErrorMessage("Loglar yuklenirken bir hata olustu.");
    } finally {
      setLoading(false);
    }
  }, [filters, hasPermission, page]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLogs(page);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadLogs, page]);

  const applyFilters = () => {
    setPage(1);
    void loadLogs(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <ActivitySquare className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Sistem Loglari</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-slate-500">Kritik kullanici ve sistem hareketleri</p>
          </div>
        </div>
        <PermissionGate permission="logs.export" fallback={<span className="text-sm text-slate-500">Disa aktarma yetkiniz yok.</span>}>
          <ExportButtons endpoint="/panel/dashboard/activity-logs/export" filename="islem_loglari" buttonLabel="Loglari Disa Aktar" params={exportableFilterParams(filters)} />
        </PermissionGate>
      </div>

      {errorMessage ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{errorMessage}</div> : null}
      {warningMessage && !errorMessage ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{warningMessage}</div> : null}

      <PermissionGate permission="logs.view" fallback={<div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center text-sm font-bold text-amber-800">Islem loglarini goruntuleme yetkiniz bulunmuyor.</div>}>
        <LogSummaryCards summary={summary} />
        <LogFiltersBar filters={filters} options={filterOptions} loading={loading} onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))} onApply={applyFilters} />
        <LogTable logs={logs} loading={loading} />

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500 shadow-sm md:flex-row md:items-center md:justify-between">
          <span>Toplam {total} kayit | Sayfa {page} / {lastPage}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-50">Onceki</button>
            <button type="button" disabled={page >= lastPage || loading} onClick={() => setPage((current) => current + 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-50">Sonraki</button>
          </div>
        </div>
      </PermissionGate>
    </div>
  );
}