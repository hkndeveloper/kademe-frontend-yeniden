import { Clock, Loader2 } from "lucide-react";
import type { ActivityLog } from "../types";
import { actionColors, compactLogSource } from "../log-utils";

type Props = {
  logs: ActivityLog[];
  loading: boolean;
};

export function LogTable({ logs, loading }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-5 py-4">Tarih</th>
              <th className="px-5 py-4">Kullanici</th>
              <th className="px-5 py-4">Kaynak</th>
              <th className="px-5 py-4">Aksiyon</th>
              <th className="px-5 py-4">Detay</th>
              <th className="px-5 py-4 text-right">Teknik</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-14 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500" />
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-14 text-center text-slate-500">Log bulunamadi.</td>
              </tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="align-top transition-colors hover:bg-slate-50">
                <td className="whitespace-nowrap px-5 py-4">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {log.created_at ? new Date(log.created_at).toLocaleString("tr-TR") : "-"}
                  </div>
                  {log.duration_ms != null ? <div className="mt-1 text-[11px] font-bold text-slate-400">{log.duration_ms} ms</div> : null}
                </td>
                <td className="px-5 py-4">
                  {log.user ? (
                    <div>
                      <div className="font-bold text-slate-900">{log.user.name} {log.user.surname}</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{log.user.role}</div>
                    </div>
                  ) : <span className="italic text-slate-400">Sistem / Anonim</span>}
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                    {compactLogSource(log.log_name)}
                  </span>
                  {log.outcome ? <div className="mt-2 text-[11px] font-bold text-slate-400">{log.outcome}</div> : null}
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${actionColors[log.action] || "bg-slate-100 text-slate-700"}`}>
                    {log.action}
                  </span>
                  {log.status_code ? <div className="mt-2 text-[11px] font-bold text-slate-400">HTTP {log.status_code}</div> : null}
                </td>
                <td className="max-w-xl px-5 py-4">
                  <div className="font-semibold text-slate-900" title={log.description}>{log.description}</div>
                  {log.path ? <div className="mt-1 truncate text-[11px] font-semibold text-slate-400">{log.path}</div> : null}
                  {log.permission_checked ? <div className="mt-1 text-[11px] font-semibold text-indigo-500">permission: {log.permission_checked}</div> : null}
                  {log.model_type ? <div className="mt-1 text-[11px] font-semibold text-slate-400">Hedef: {log.model_type.split("\\").pop()} #{log.model_id}</div> : null}
                </td>
                <td className="px-5 py-4 text-right font-mono text-[11px] text-slate-400">
                  <div>{log.ip_address || "-"}</div>
                  {log.request_id ? <div className="mt-1 max-w-[160px] truncate" title={log.request_id}>{log.request_id}</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}