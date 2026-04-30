"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, Download, FileText, Filter, Loader2, Plus, Search, Upload } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { useAuth } from "@/store/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

interface Project {
  id: number;
  name: string;
  active_period?: {
    id: number;
    name?: string | null;
  } | null;
}

interface Transaction {
  id: number;
  project_id: number;
  period_id?: number | null;
  category: string;
  payee_name: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "paid";
  invoice_path?: string | null;
  created_at: string;
  submitted_at?: string | null;
  project?: { id: number; name: string } | null;
  period?: { id: number; name: string } | null;
}

interface CategoryStat {
  category: string;
  total: number;
}

const statusColors: Record<Transaction["status"], string> = {
  pending: "bg-amber-500/10 text-amber-500",
  approved: "bg-green-500/10 text-green-500",
  rejected: "bg-red-500/10 text-red-500",
  paid: "bg-blue-500/10 text-blue-500",
};

const statusLabels: Record<Transaction["status"], string> = {
  pending: "Bekliyor",
  approved: "Onaylandi",
  rejected: "Reddedildi",
  paid: "Odendi",
};

const formCategoryToApiCategory: Record<string, string> = {
  ikram: "food",
  ulasim: "transport",
  baski: "print",
  egitim: "education",
  diger: "other",
  konaklama: "other",
};

const categoryLabels: Record<string, string> = {
  food: "Ikram ve Yemek",
  transport: "Ulasim",
  print: "Baski",
  education: "Egitim",
  other: "Diger",
  ikram: "Ikram ve Yemek",
  ulasim: "Ulasim",
  baski: "Baski",
  egitim: "Egitim",
  diger: "Diger",
  konaklama: "Konaklama",
};

export default function ContributorFinancialsPage() {
  const { hasPermission } = useAuth();
  const { canAccessProject } = usePermissions();
  const [activeTab, setActiveTab] = useState<"list" | "new">("list");
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const [formProjectId, setFormProjectId] = useState("");
  const [formCategory, setFormCategory] = useState("ikram");
  const [formPayee, setFormPayee] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const canViewFinancials = hasPermission("financial.view");
  const canCreateFinancials = hasPermission("financial.create");

  const loadTransactions = useCallback(async () => {
    setListLoading(true);
    setErrorMessage("");
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;

      const response = await api.get("/panel/financials", { params });
      const items = Array.isArray(response.data?.transactions?.data) ? response.data.transactions.data : [];
      setTransactions(items);
    } catch (error) {
      console.error("Mali islemler yuklenemedi", error);
      setErrorMessage("Mali islemler yuklenirken bir hata olustu.");
    } finally {
      setListLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const [projectResponse] = await Promise.all([
          api.get<{ projects: Project[] }>("/panel/projects/manageable"),
          loadTransactions(),
        ]);
        const permittedProjects = (projectResponse.data.projects ?? []).filter((project) =>
          canAccessProject("financial.create", project.id)
          || canAccessProject("financial.view", project.id)
        );
        setProjects(permittedProjects);
      } catch (error) {
        console.error("Sayfa verileri yuklenemedi", error);
        setErrorMessage("Sayfa verileri yuklenirken bir hata olustu.");
      } finally {
        setLoading(false);
      }
    };

    void initData();
  }, [loadTransactions, canAccessProject]);

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");

    return transactions.filter((transaction) => {
      const matchesProject = !projectFilter || String(transaction.project_id) === projectFilter;
      const matchesSearch =
        !normalizedSearch ||
        transaction.payee_name.toLocaleLowerCase("tr-TR").includes(normalizedSearch) ||
        (transaction.project?.name ?? "").toLocaleLowerCase("tr-TR").includes(normalizedSearch);

      return matchesProject && matchesSearch;
    });
  }, [projectFilter, search, transactions]);

  const totalAmount = useMemo(
    () => filteredTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
    [filteredTransactions],
  );

  const categoryStats = useMemo<CategoryStat[]>(() => {
    const totals = filteredTransactions.reduce<Record<string, number>>((acc, transaction) => {
      const key = transaction.category || "other";
      acc[key] = (acc[key] || 0) + Number(transaction.amount || 0);
      return acc;
    }, {});

    return Object.entries(totals)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  const resetForm = () => {
    setFormProjectId("");
    setFormCategory("ikram");
    setFormPayee("");
    setFormAmount("");
    setFormFile(null);
  };

  const handleApplyFilters = () => {
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleDownload = async (id: number) => {
    try {
      const res = await api.get(`/panel/financials/${id}/invoice`, { responseType: "blob" });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `fatura-${id}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Fatura indirilemedi", error);
      setErrorMessage("Fatura indirilemedi.");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formProjectId || !formPayee.trim() || !formAmount || !formFile) {
      setErrorMessage("Proje, kategori, alici, tutar ve belge zorunludur.");
      return;
    }

    const selectedProject = projects.find((project) => String(project.id) === formProjectId);

    setSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("project_id", formProjectId);
      if (selectedProject?.active_period?.id) {
        formData.append("period_id", String(selectedProject.active_period.id));
      }
      formData.append("type", "expense");
      formData.append("category", formCategoryToApiCategory[formCategory] ?? "other");
      formData.append("payee_name", formPayee.trim());
      formData.append("amount", formAmount);
      formData.append("invoice", formFile);

      await api.post("/panel/financials", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      resetForm();
      setActiveTab("list");
      setSuccessMessage("Fatura basariyla onaya gonderildi.");
      await loadTransactions();
    } catch (error) {
      console.error("Fatura gonderilemedi", error);
      setErrorMessage("Fatura kaydedilirken bir hata olustu.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent">
            <CreditCard className="h-7 w-7" />
          </div>
        <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Mali Islemler</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Fatura yonetimi ve butce takibi
            </p>
          </div>
        </div>
        <PermissionGate permission="financial.export">
          <ExportButtons
            endpoint="/panel/financials/export"
            filename="panel_finans"
            params={{ project_id: projectFilter || undefined, status: statusFilter || undefined }}
            buttonLabel="Finans Verisini Disa Aktar"
          />
        </PermissionGate>
      </div>

      {(successMessage || errorMessage) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            errorMessage
              ? "border-red-500/20 bg-red-500/10 text-red-200"
              : "border-green-500/20 bg-green-500/10 text-green-200"
          }`}
        >
          {errorMessage || successMessage}
        </div>
      )}

      {(canViewFinancials || canCreateFinancials) && (
        <div className="flex space-x-1 rounded-2xl bg-black/40 p-1 md:w-max">
          {canViewFinancials && (
            <button
              onClick={() => setActiveTab("list")}
              className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                activeTab === "list"
                  ? "bg-accent text-accent-foreground shadow-lg"
                  : "text-muted-foreground hover:bg-white/5 hover:text-slate-900"
              }`}
            >
              <FileText className="h-4 w-4" />
              Fatura Gecmisi
            </button>
          )}
          {canCreateFinancials && (
            <button
              onClick={() => setActiveTab("new")}
              className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                activeTab === "new"
                  ? "bg-accent text-accent-foreground shadow-lg"
                  : "text-muted-foreground hover:bg-white/5 hover:text-slate-900"
              }`}
            >
              <Upload className="h-4 w-4" />
              Yeni Fatura Yukle
            </button>
          )}
        </div>
      )}

      <PermissionGate
        permissions={["financial.view", "financial.create"]}
        require="any"
        fallback={
        <div className="glass-panel rounded-3xl p-10 text-center text-sm text-muted-foreground">
          Bu modulu goruntulemek icin yetkiniz bulunmuyor.
        </div>
        }
      >
      {activeTab === "list" && canViewFinancials ? (
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6">
            <h3 className="mb-6 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Kategori Bazli Harcamalar
            </h3>
            <div className="space-y-4">
              {categoryStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henuz veri bulunamadi.</p>
              ) : (
                categoryStats.map((stat) => {
                  const percentage = totalAmount > 0 ? (stat.total / totalAmount) * 100 : 0;
                  return (
                    <div key={stat.category}>
                      <div className="mb-1 flex justify-between text-xs font-bold uppercase tracking-widest text-slate-900">
                        <span>{categoryLabels[stat.category] || stat.category}</span>
                        <span>
                          {stat.total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL (
                          {percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                        <div className="h-full bg-accent" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="glass-panel flex flex-col gap-4 rounded-3xl p-6 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-accent"
                placeholder="Alici veya proje ara..."
              />
            </div>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-accent"
            >
              <option value="">Tum Projeler</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-accent"
            >
              <option value="">Tum Durumlar</option>
              <option value="pending">Bekleyen</option>
              <option value="approved">Onaylanan</option>
              <option value="paid">Odenen</option>
              <option value="rejected">Reddedilen</option>
            </select>
            <button
              onClick={handleApplyFilters}
              className="flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-accent-foreground shadow-lg shadow-accent/20 hover:opacity-90"
            >
              <Filter className="h-4 w-4" />
              Filtrele
            </button>
          </div>

          <div className="glass-panel overflow-hidden rounded-3xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-muted-foreground">
                <thead className="border-b border-white/5 bg-white/5 text-xs font-bold uppercase tracking-widest text-slate-900">
                  <tr>
                    <th className="px-6 py-4">Tarih</th>
                    <th className="px-6 py-4">Proje / Kategori</th>
                    <th className="px-6 py-4">Alici</th>
                    <th className="px-6 py-4">Tutar</th>
                    <th className="px-6 py-4">Durum</th>
                    <th className="px-6 py-4 text-right">Belge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {listLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        Islem bulunamadi.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="transition-colors hover:bg-white/5">
                        <td className="px-6 py-4">
                          {new Date(transaction.submitted_at ?? transaction.created_at).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{transaction.project?.name || "-"}</div>
                          <div className="text-[10px] uppercase text-accent">
                            {categoryLabels[transaction.category] || transaction.category}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-900">{transaction.payee_name}</div>
                          {transaction.period?.name && (
                            <div className="text-[10px] text-muted-foreground">{transaction.period.name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {Number(transaction.amount).toLocaleString("tr-TR", {
                            style: "currency",
                            currency: "TRY",
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${statusColors[transaction.status]}`}
                          >
                            {statusLabels[transaction.status] || transaction.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <PermissionGate permission="financial.invoice.download">
                          {transaction.invoice_path ? (
                            <button
                              onClick={() => handleDownload(transaction.id)}
                              className="inline-flex items-center justify-center rounded-lg bg-white/5 p-2 text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
                              title="Faturayi indir"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          ) : null}
                          </PermissionGate>
                          {!transaction.invoice_path ? (
                            <span className="text-[10px] text-muted-foreground">Belge Yok</span>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "new" && canCreateFinancials && (
        <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-8 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Proje</label>
              <select
                value={formProjectId}
                onChange={(e) => setFormProjectId(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-accent"
              >
                <option value="">Proje Secin</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Kategori</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-accent"
              >
                <option value="ikram">Ikram ve Yemek</option>
                <option value="ulasim">Ulasim</option>
                <option value="baski">Baski</option>
                <option value="egitim">Egitim</option>
                <option value="konaklama">Konaklama</option>
                <option value="diger">Diger</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Alici / Firma Adi
              </label>
              <input
                value={formPayee}
                onChange={(e) => setFormPayee(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-accent"
                placeholder="Orn: ABC Catering A.S."
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tutar (TL)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-accent"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Upload className="h-4 w-4" />
              Fatura / FiS Belgesi
            </label>
            <input
              type="file"
              onChange={(e) => setFormFile(e.target.files?.[0] || null)}
              accept=".pdf,.jpg,.jpeg,.png"
              className="block w-full text-xs text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-widest file:text-accent-foreground hover:file:opacity-90"
            />
            <p className="text-xs text-muted-foreground">
              Yuklenen belge admin onayina duser. Gerekirse aktif donem otomatik olarak secilir.
            </p>
          </div>

          <div className="flex justify-end border-t border-white/5 pt-6">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-accent px-8 py-3 text-sm font-bold uppercase tracking-widest text-accent-foreground shadow-lg shadow-accent/20 transition-all hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              Faturayi Gonder
            </button>
          </div>
        </form>
      )}
      </PermissionGate>
    </div>
  );
}
