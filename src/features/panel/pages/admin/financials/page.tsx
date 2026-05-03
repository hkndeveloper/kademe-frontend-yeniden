"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle,
  CheckCircle2,
  CreditCard,
  FileText,
  Filter,
  Loader2,
  Search,
  XCircle,
} from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { useAuth } from "@/store/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

interface Project {
  id: number;
  name: string;
}

interface FinancialTransaction {
  id: number;
  project?: { id: number; name: string };
  period?: { id: number; name: string };
  submitter?: { id: number; name: string; surname: string };
  approver?: { id: number; name: string; surname: string };
  type: "expense" | "payment";
  category: "transport" | "food" | "print" | "education" | "other";
  payee_name: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "paid";
  invoice_path?: string | null;
  submitted_at: string;
}

const categoryLabels: Record<string, string> = {
  transport: "Ulasim",
  food: "Yemek",
  print: "Baski",
  education: "Egitim",
  other: "Diger",
};

const statusLabels: Record<string, string> = {
  pending: "Bekliyor",
  approved: "Onaylandi",
  rejected: "Reddedildi",
  paid: "Odendi",
};

const statusClasses: Record<string, string> = {
  pending: "text-amber-300 bg-amber-500/10",
  approved: "text-blue-300 bg-blue-500/10",
  rejected: "text-red-300 bg-red-500/10",
  paid: "text-emerald-300 bg-emerald-500/10",
};

export default function AdminFinancialsPage() {
  const { hasPermission } = useAuth();
  const { canAccessProject } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [categoryStats, setCategoryStats] = useState<Array<{ category: string; total: number }>>([]);
  const [projectStats, setProjectStats] = useState<Array<{ project?: { name: string }; total: number }>>([]);
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const canDownloadInvoice = hasPermission("financial.invoice.download");
  const canApproveFinancials = hasPermission("financial.approve");
  const canRejectFinancials = hasPermission("financial.reject");
  const canDeleteFinancials = hasPermission("financial.delete");
  const canMarkPaidFinancials = hasPermission("financial.mark_paid");

  const loadData = useCallback(async (targetPage = page) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [financialResponse, projectsResponse] = await Promise.all([
        api.get("/panel/financials", {
          params: {
            page: targetPage,
            project_id: projectId || undefined,
            status: status || undefined,
            payee: search || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
          },
        }),
        hasPermission("financial.view")
          ? api.get<{ projects: Array<{ id: number; name: string }> }>("/panel/projects/manageable", {
              params: { permission: "financial.view" },
            })
          : Promise.resolve({ data: { projects: [] } }),
      ]);

      setTransactions(financialResponse.data.transactions?.data ?? []);
      setTotalPages(financialResponse.data.transactions?.last_page ?? 1);
      setTotalAmount(Number(financialResponse.data.total_amount ?? 0));
      setCategoryStats(financialResponse.data.category_stats ?? []);
      setProjectStats(financialResponse.data.project_stats ?? []);
      const rawProjects = projectsResponse.data.projects ?? [];
      setProjects(rawProjects.filter((p) => canAccessProject("financial.view", p.id)));
    } catch (error) {
      console.error("Financial data could not be loaded", error);
      setErrorMessage("Mali islemler yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, page, projectId, search, status, hasPermission, canAccessProject]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData(page);
  }, [loadData, page]);

  const applyFilters = () => {
    setPage(1);
    void loadData(1);
  };

  const handleAction = async (id: number, action: "approve" | "reject" | "pay" | "delete") => {
    setActionLoading(id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (action === "delete") {
        await api.delete(`/panel/financials/${id}`);
      } else {
        await api.put(`/panel/financials/${id}/${action}`);
      }

      setSuccessMessage("Finans islemi guncellendi.");
      await loadData();
    } catch (error) {
      console.error("Financial action failed", error);
      setErrorMessage("Finans islemi tamamlanamadi.");
    } finally {
      setActionLoading(null);
    }
  };

  const downloadInvoice = async (id: number, name: string) => {
    setActionLoading(id);
    setErrorMessage("");

    try {
      const response = await api.get(`/panel/financials/${id}/invoice`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `fatura_${name.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Invoice could not be downloaded", error);
      setErrorMessage("Fatura indirilemedi.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Mali Islemler</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Harcama, odeme, onay ve fatura yonetimi
          </p>
        </div>
        <PermissionGate permission="financial.export">
          <ExportButtons
            endpoint="/panel/financials/export"
            filename={`finansal_islemler_${new Date().toISOString().slice(0, 10)}`}
            params={{
              project_id: projectId || undefined,
              status: status || undefined,
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
            }}
            buttonLabel="Disa Aktar"
          />
        </PermissionGate>
      </div>

      {(errorMessage || successMessage) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            errorMessage
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {errorMessage || successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass-panel flex items-center justify-between rounded-3xl p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Filtrelenen Toplam Tutar
            </p>
            <h4 className="mt-1 text-3xl font-black text-slate-900">
              {totalAmount.toLocaleString("tr-TR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              TL
            </h4>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
            <CreditCard className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-3xl p-6">
          <h3 className="mb-6 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Kategori Bazli Harcamalar
          </h3>
          <div className="space-y-4">
            {categoryStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Veri bulunamadi.</p>
            ) : (
              categoryStats.map((stat, index) => {
                const total = Number(stat.total);
                const percentage = totalAmount > 0 ? (total / totalAmount) * 100 : 0;

                return (
                  <div key={`category-${index}`}>
                    <div className="mb-1 flex justify-between text-xs font-bold text-slate-900">
                      <span>{categoryLabels[stat.category] || stat.category}</span>
                      <span>
                        {total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL (
                        {percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <div className="h-full bg-indigo-500" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <h3 className="mb-6 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Proje Bazli Harcamalar
          </h3>
          <div className="space-y-4">
            {projectStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Veri bulunamadi.</p>
            ) : (
              projectStats.map((stat, index) => {
                const total = Number(stat.total);
                const percentage = totalAmount > 0 ? (total / totalAmount) * 100 : 0;

                return (
                  <div key={`project-${index}`}>
                    <div className="mb-1 flex justify-between text-xs font-bold text-slate-900">
                      <span>{stat.project?.name || "Bilinmeyen Proje"}</span>
                      <span>
                        {total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL (
                        {percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <div className="h-full bg-emerald-500" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel flex flex-col gap-4 rounded-3xl p-6">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && applyFilters()}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-indigo-500"
              placeholder="Firma veya kisi ara"
            />
          </div>

          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="min-w-[200px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
          >
            <option value="">Tum projeler</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
          >
            <option value="">Tum durumlar</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col items-center gap-4 md:flex-row">
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
          />
          <span className="text-muted-foreground">-</span>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
          />
          <button
            onClick={applyFilters}
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-indigo-700"
          >
            <Filter className="h-4 w-4" />
            Filtrele
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden rounded-3xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted-foreground">
            <thead className="border-b border-white/5 bg-white/5 text-xs font-bold uppercase tracking-widest text-slate-900">
              <tr>
                <th className="px-6 py-4">Tarih</th>
                <th className="px-6 py-4">Proje / Kategori</th>
                <th className="px-6 py-4">Odeme Yapilacak Kisi/Firma</th>
                <th className="px-6 py-4">Tutar</th>
                <th className="px-6 py-4">Gonderen</th>
                <th className="px-6 py-4">Durum</th>
                <th className="px-6 py-4 text-right">Islemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-400" />
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    Kayit bulunamadi.
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="transition-colors hover:bg-white/5">
                    <td className="px-6 py-4">
                      {new Date(transaction.submitted_at).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{transaction.project?.name || "-"}</div>
                      <div className="text-xs">
                        {categoryLabels[transaction.category] || transaction.category}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{transaction.payee_name}</td>
                    <td className="px-6 py-4 font-black text-indigo-300">
                      {transaction.amount.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      TL
                    </td>
                    <td className="px-6 py-4">
                      {transaction.submitter
                        ? `${transaction.submitter.name} ${transaction.submitter.surname}`
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${statusClasses[transaction.status]}`}
                      >
                        {statusLabels[transaction.status] || transaction.status}
                      </span>
                    </td>
                    <td className="space-x-2 px-6 py-4 text-right">
                      {canDownloadInvoice &&
                        transaction.invoice_path &&
                        transaction.project?.id != null &&
                        canAccessProject("financial.invoice.download", transaction.project.id) && (
                        <button
                          type="button"
                          onClick={() => void downloadInvoice(transaction.id, transaction.payee_name)}
                          className="inline-flex items-center justify-center rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-indigo-500 hover:text-white"
                          title="Faturayi indir"
                        >
                          {actionLoading === transaction.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </button>
                      )}

                      {transaction.status === "pending" && transaction.project?.id != null && (
                        <>
                          {canApproveFinancials &&
                            canAccessProject("financial.approve", transaction.project.id) && (
                            <button
                              type="button"
                              onClick={() => void handleAction(transaction.id, "approve")}
                              className="inline-flex items-center justify-center rounded-lg bg-white/5 p-2 text-emerald-300 transition hover:bg-emerald-500 hover:text-white"
                              title="Onayla"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {canRejectFinancials &&
                            canAccessProject("financial.reject", transaction.project.id) && (
                            <button
                              type="button"
                              onClick={() => void handleAction(transaction.id, "reject")}
                              className="inline-flex items-center justify-center rounded-lg bg-white/5 p-2 text-red-300 transition hover:bg-red-500 hover:text-white"
                              title="Reddet"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          {canDeleteFinancials &&
                            canAccessProject("financial.delete", transaction.project.id) && (
                            <button
                              type="button"
                              onClick={() => void handleAction(transaction.id, "delete")}
                              className="rounded-lg bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-red-600 hover:text-white"
                            >
                              Sil
                            </button>
                          )}
                        </>
                      )}

                      {canMarkPaidFinancials &&
                        transaction.status === "approved" &&
                        transaction.project?.id != null &&
                        canAccessProject("financial.mark_paid", transaction.project.id) && (
                        <button
                          type="button"
                          onClick={() => void handleAction(transaction.id, "pay")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500 hover:text-white"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Odendi Yap
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/5 px-6 py-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-900 disabled:opacity-50"
            >
              Onceki
            </button>
            <span className="text-xs font-bold text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-900 disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
