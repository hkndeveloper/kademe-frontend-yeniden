"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivitySquare, Clock, Filter, Loader2, Search } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

interface ActivityLog {
  id: number;
  user_id: number | null;
  action: string;
  description: string;
  model_type: string | null;
  model_id: number | null;
  ip_address: string | null;
  created_at: string;
  user?: { name: string; surname: string; role: string } | null;
  log_name?: string | null;
}

function normalizeActivityRow(raw: Record<string, unknown>): ActivityLog {
  const causer = raw.causer as { id?: number; name?: string; surname?: string; role?: string } | undefined;
  const event = raw.event != null && String(raw.event).length > 0 ? String(raw.event) : null;

  return {
    id: Number(raw.id),
    user_id: causer?.id ?? null,
    action: event ?? String(raw.description ?? "log"),
    description: String(raw.description ?? ""),
    model_type: raw.subject_type != null ? String(raw.subject_type) : null,
    model_id: raw.subject_id != null ? Number(raw.subject_id) : null,
    ip_address: raw.ip_address != null ? String(raw.ip_address) : null,
    created_at: String(raw.created_at ?? ""),
    user: causer
      ? {
          name: String(causer.name ?? ""),
          surname: String(causer.surname ?? ""),
          role: String(causer.role ?? ""),
        }
      : null,
    log_name: raw.log_name != null ? String(raw.log_name) : null,
  };
}

const actionColors: Record<string, string> = {
  created: "bg-green-500/10 text-green-500",
  updated: "bg-blue-500/10 text-blue-500",
  deleted: "bg-red-500/10 text-red-500",
  login: "bg-indigo-500/10 text-indigo-500",
  logout: "bg-gray-500/10 text-gray-400",
  assigned: "bg-amber-500/10 text-amber-500",
  status_changed: "bg-purple-500/10 text-purple-500",
};

export default function AdminLogsPage() {
  const { hasPermission } = usePermissions();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [logNameFilter, setLogNameFilter] = useState<"" | "permissions">("");

  const loadLogs = useCallback(async () => {
    if (!hasPermission("logs.view")) {
      setLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await api.get("/panel/dashboard/activity-logs", {
        params: logNameFilter ? { log_name: logNameFilter } : undefined,
      });
      const raw = Array.isArray(res.data?.logs) ? res.data.logs : [];
      setLogs(raw.map((item: Record<string, unknown>) => normalizeActivityRow(item)));
    } catch (error) {
      console.error("Loglar yuklenemedi", error);
      setErrorMessage("Loglar yuklenirken bir hata olustu.");
    } finally {
      setLoading(false);
    }
  }, [hasPermission, logNameFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLogs();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");

    return logs.filter((log) => {
      const matchesAction = !actionFilter || log.action === actionFilter;
      const haystack = [
        log.description,
        log.user?.name,
        log.user?.surname,
        log.user?.role,
        log.model_type,
        log.ip_address,
        log.log_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      return matchesAction && matchesSearch;
    });
  }, [actionFilter, logs, search]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
            <ActivitySquare className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Sistem Loglari</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Kritik kullanici ve sistem hareketleri
            </p>
          </div>
        </div>
        <PermissionGate
          permission="logs.export"
          fallback={<span className="text-sm text-muted-foreground">Disa aktarma yetkiniz yok.</span>}
        >
          <ExportButtons
            endpoint="/panel/dashboard/activity-logs/export"
            filename="islem_loglari"
            buttonLabel="Loglari Disa Aktar"
            params={logNameFilter ? { log_name: logNameFilter } : {}}
          />
        </PermissionGate>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      <PermissionGate
        permission="logs.view"
        fallback={
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-6 py-8 text-center text-sm text-amber-100">
            Islem loglarini goruntuleme yetkiniz bulunmuyor.
          </div>
        }
      >
      <div className="glass-panel flex flex-col gap-4 rounded-3xl p-6 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-indigo-500"
            placeholder="Aciklama, hedef model veya kullanici ara..."
          />
        </div>
        <select
          value={logNameFilter}
          onChange={(e) => setLogNameFilter(e.target.value as "" | "permissions")}
          className="min-w-[200px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
        >
          <option value="">Tum kaynaklar</option>
          <option value="permissions">Yetki matrisi / override</option>
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="min-w-[180px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
        >
          <option value="">Tum Islemler</option>
          <option value="created">Olusturma</option>
          <option value="updated">Guncelleme</option>
          <option value="deleted">Silme</option>
          <option value="login">Giris</option>
          <option value="logout">Cikis</option>
          <option value="status_changed">Durum</option>
          <option value="assigned">Atama</option>
        </select>
        <button
          onClick={() => void loadLogs()}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700"
        >
          <Filter className="h-4 w-4" />
          Yenile
        </button>
      </div>

      <div className="glass-panel overflow-hidden rounded-3xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted-foreground">
            <thead className="border-b border-white/5 bg-white/5 text-xs font-bold uppercase tracking-widest text-slate-900">
              <tr>
                <th className="px-6 py-4">Tarih</th>
                <th className="px-6 py-4">Islem Yapan</th>
                <th className="px-6 py-4">Aksiyon</th>
                <th className="px-6 py-4">Detay</th>
                <th className="px-6 py-4 text-right">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-400" />
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Log bulunamadi.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-white/5">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-900">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {new Date(log.created_at).toLocaleString("tr-TR")}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {log.user ? (
                        <div>
                          <div className="font-bold text-slate-900">
                            {log.user.name} {log.user.surname}
                          </div>
                          <div className="text-[10px] uppercase tracking-widest text-indigo-400">{log.user.role}</div>
                        </div>
                      ) : (
                        <span className="italic text-muted-foreground">Sistem / Anonim</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                          actionColors[log.action] || "bg-white/10 text-slate-900"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="max-w-md px-6 py-4">
                      <div className="truncate text-slate-900" title={log.description}>
                        {log.description}
                      </div>
                      {log.model_type && (
                        <div className="text-[10px] uppercase text-muted-foreground">
                          Hedef: {log.model_type.split("\\").pop()} #{log.model_id}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-muted-foreground">
                      {log.ip_address || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </PermissionGate>
    </div>
  );
}
