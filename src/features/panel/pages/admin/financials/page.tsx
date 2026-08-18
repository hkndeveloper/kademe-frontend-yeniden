"use client";

import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import {
  CheckCircle,
  CheckCircle2,
  CreditCard,
  FileText,
  Filter,
  Loader2,
  Plus,
  Search,
  Upload,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { defaultPeriodIdForProject, ProjectPeriodFilters, type PeriodOption } from "@/components/shared/ProjectPeriodFilters";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { useAuth } from "@/store/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { downloadBlobResponse } from "@/lib/download";

interface Project {
  id: number;
  name: string;
  active_period?: PeriodOption | null;
  periods?: PeriodOption[];
}

interface FinancialTransaction {
  id: number;
  project?: { id: number; name: string };
  period?: { id: number; name: string };
  submitter?: { id: number; name: string; surname: string };
  approver?: { id: number; name: string; surname: string };
  type: "expense" | "payment";
  category: string;
  category_note?: string | null;
  spending_unit?: string | null;
  payee_name: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "paid";
  invoice_path?: string | null;
  invoice_no?: string | null;
  payment_date?: string | null;
  payment_method?: string | null;
  accounting_code?: string | null;
  submitted_at: string;
}

const categoryLabels: Record<string, string> = {
  transport: "Ulasim",
  food: "Yemek",
  print: "Baski",
  education: "Egitim",
  lodging: "Konaklama",
  ticket: "Bilet",
  official_document: "Resmi Evrak",
  media_design: "Medya / Tasarim",
  other: "Diger",
};

const paymentMethodLabels: Record<string, string> = {
  bank_transfer: "Banka Havalesi",
  cash: "Nakit",
  card: "Kart",
  other: "Diger",
};

const statusLabels: Record<string, string> = {
  pending: "Bekliyor",
  approved: "Onaylandi",
  rejected: "Reddedildi",
  paid: "Odendi",
};

const statusClasses: Record<string, string> = {
  pending: "text-blue-700 bg-blue-50 ring-1 ring-blue-200",
  approved: "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200",
  rejected: "text-red-700 bg-red-50 ring-1 ring-red-200",
  paid: "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200",
};

const typeLabels: Record<string, string> = {
  expense: "Harcama",
  payment: "Odeme",
};

export default function AdminFinancialsPage() {
  const { hasPermission } = useAuth();
  const { canAccessProject, hasGlobalScope } = usePermissions();
  const [activeTab, setActiveTab] = useState<"list" | "new">("list");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [createProjects, setCreateProjects] = useState<Project[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [categoryStats, setCategoryStats] = useState<Array<{ category: string; total: number }>>([]);
  const [projectStats, setProjectStats] = useState<Array<{ project?: { name: string }; total: number }>>([]);
  const [statusStats, setStatusStats] = useState<Array<{ status: string; total: number; count: number }>>([]);
  const [projectId, setProjectId] = useState("");
  const [periodId, setPeriodId] = useState("all");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [formPeriodId, setFormPeriodId] = useState("");
  const [formCategory, setFormCategory] = useState("food");
  const [formCategoryNote, setFormCategoryNote] = useState("");
  const [formSpendingUnit, setFormSpendingUnit] = useState("");
  const [formPayee, setFormPayee] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formInvoiceNo, setFormInvoiceNo] = useState("");
  const [formPaymentDate, setFormPaymentDate] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState("");
  const [formAccountingCode, setFormAccountingCode] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const canViewFinancials = hasPermission("financial.view");
  const canCreateFinancials = hasPermission("financial.create");
  const canDownloadInvoice = hasPermission("financial.invoice.download");
  const canApproveFinancials = hasPermission("financial.approve") && hasGlobalScope("financial.approve");
  const canRejectFinancials = hasPermission("financial.reject") && hasGlobalScope("financial.reject");
  const canDeleteFinancials = hasPermission("financial.delete") && hasGlobalScope("financial.delete");
  const canMarkPaidFinancials = hasPermission("financial.mark_paid") && hasGlobalScope("financial.mark_paid");

  const loadData = useCallback(async (targetPage = page) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [financialResponse, projectsResponse, createProjectsResponse] = await Promise.all([
        canViewFinancials
          ? api.get("/panel/financials", {
              params: {
                page: targetPage,
                project_id: projectId || undefined,
                period_id: periodId !== "all" ? periodId : undefined,
                status: status || undefined,
                category: category || undefined,
                type: transactionType || undefined,
                payee: search || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
              },
            })
          : Promise.resolve({
              data: {
                transactions: { data: [], last_page: 1 },
                total_amount: 0,
                category_stats: [],
                project_stats: [],
                status_stats: [],
              },
            }),
        hasPermission("financial.view")
          ? api.get<{ projects: Array<{ id: number; name: string }> }>("/panel/projects/manageable", {
              params: { permission: "financial.view" },
            })
          : Promise.resolve({ data: { projects: [] } }),
        canCreateFinancials
          ? api.get<{ projects: Project[] }>("/panel/projects/manageable", {
              params: { permission: "financial.create" },
            })
          : Promise.resolve({ data: { projects: [] } }),
      ]);

      setTransactions(financialResponse.data.transactions?.data ?? []);
      setTotalPages(financialResponse.data.transactions?.last_page ?? 1);
      setTotalAmount(Number(financialResponse.data.total_amount ?? 0));
      setCategoryStats(financialResponse.data.category_stats ?? []);
      setProjectStats(financialResponse.data.project_stats ?? []);
      setStatusStats(financialResponse.data.status_stats ?? []);
      const rawProjects = projectsResponse.data.projects ?? [];
      setProjects(rawProjects.filter((p) => canAccessProject("financial.view", p.id)));
      const rawCreateProjects = createProjectsResponse.data.projects ?? [];
      setCreateProjects(rawCreateProjects.filter((p) => canAccessProject("financial.create", p.id)));
    } catch (error) {
      console.error("Financial data could not be loaded", error);
      setErrorMessage("Mali islemler yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [
    dateFrom,
    dateTo,
    category,
    page,
    projectId,
    periodId,
    search,
    status,
    transactionType,
    hasPermission,
    canAccessProject,
    canCreateFinancials,
    canViewFinancials,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData(page);
  }, [loadData, page]);

  useEffect(() => {
    if (!canViewFinancials && canCreateFinancials) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab("new");
    }
  }, [canCreateFinancials, canViewFinancials]);

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
      await downloadBlobResponse(response.data, response.headers, `fatura_${name}`);
    } catch (error) {
      if (isAxiosError(error)) {
        if (error.response?.status === 403) {
          setErrorMessage("Bu fatura dosyasini indirme yetkiniz bulunmuyor.");
          return;
        }
        if (error.response?.status === 404) {
          setErrorMessage("Fatura dosyasi bulunamadi veya silinmis olabilir.");
          return;
        }
      }
      console.error("Invoice could not be downloaded", error);
      setErrorMessage("Fatura indirilemedi.");
    } finally {
      setActionLoading(null);
    }
  };

  const resetForm = () => {
    setFormProjectId("");
    setFormPeriodId("");
    setFormCategory("food");
    setFormCategoryNote("");
    setFormSpendingUnit("");
    setFormPayee("");
    setFormAmount("");
    setFormInvoiceNo("");
    setFormPaymentDate("");
    setFormPaymentMethod("");
    setFormAccountingCode("");
    setFormFile(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formProjectId || !formPayee.trim() || !formAmount || !formFile || (formCategory === "other" && !formCategoryNote.trim())) {
      setErrorMessage(formCategory === "other" && !formCategoryNote.trim() ? "Diger kategori secildiginde not alani zorunludur." : "Proje, kategori, alici, tutar ve belge zorunludur.");
      return;
    }

    const selectedProject = createProjects.find((project) => String(project.id) === formProjectId);
    if (!selectedProject || !canAccessProject("financial.create", selectedProject.id)) {
      setErrorMessage("Bu proje icin fatura olusturma yetkiniz bulunmuyor.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const formData = new FormData();
      formData.append("project_id", formProjectId);
      if (formPeriodId || selectedProject.active_period?.id) {
        formData.append("period_id", formPeriodId || String(selectedProject.active_period?.id));
      }
      formData.append("type", "expense");
      formData.append("category", formCategory);
      if (formCategory === "other") formData.append("category_note", formCategoryNote.trim());
      if (formSpendingUnit.trim()) formData.append("spending_unit", formSpendingUnit.trim());
      formData.append("payee_name", formPayee.trim());
      formData.append("amount", formAmount);
      if (formInvoiceNo.trim()) formData.append("invoice_no", formInvoiceNo.trim());
      if (formPaymentDate) formData.append("payment_date", formPaymentDate);
      if (formPaymentMethod) formData.append("payment_method", formPaymentMethod);
      if (formAccountingCode.trim()) formData.append("accounting_code", formAccountingCode.trim());
      formData.append("invoice", formFile);

      await api.post("/panel/financials", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      resetForm();
      setActiveTab("list");
      setSuccessMessage("Fatura basariyla onaya gonderildi.");
      await loadData(1);
    } catch (error) {
      console.error("Invoice could not be submitted", error);
      setErrorMessage("Fatura kaydedilirken bir hata olustu.");
    } finally {
      setSubmitting(false);
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
              period_id: periodId !== "all" ? periodId : undefined,
              status: status || undefined,
              category: category || undefined,
              type: transactionType || undefined,
              payee: search || undefined,
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
            }}
            buttonLabel="Disa Aktar"
          />
        </PermissionGate>
      </div>

      {(errorMessage || successMessage) && (
        <div
          className={`panel-notice ${
            errorMessage
              ? "panel-notice-error"
              : "panel-notice-success"
          }`}
        >
          {errorMessage || successMessage}
        </div>
      )}

      {(canViewFinancials || canCreateFinancials) && (
        <div className="panel-tabs md:w-max">
          {canViewFinancials && (
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={`panel-tab ${
                activeTab === "list"
                  ? "panel-tab-active"
                  : ""
              }`}
            >
              <FileText className="h-4 w-4" />
              Fatura Listesi
            </button>
          )}
          {canCreateFinancials && (
            <button
              type="button"
              onClick={() => setActiveTab("new")}
              className={`panel-tab ${
                activeTab === "new"
                  ? "panel-tab-active"
                  : ""
              }`}
            >
              <Upload className="h-4 w-4" />
              Yeni Fatura Yukle
            </button>
          )}
        </div>
      )}

      {activeTab === "list" && canViewFinancials ? (
        <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="panel-stat-card flex items-center justify-between">
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
        {(["pending", "approved", "rejected", "paid"] as const).map((statusKey) => {
          const stat = statusStats.find((item) => item.status === statusKey);
          const amount = Number(stat?.total ?? 0);

          return (
            <button
              key={statusKey}
              type="button"
              onClick={() => {
                setStatus((current) => (current === statusKey ? "" : statusKey));
                setPage(1);
              }}
              className={`panel-stat-card-button flex items-center justify-between ${
                status === statusKey ? "panel-stat-card-active" : ""
              }`}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {statusLabels[statusKey]}
                </p>
                <h4 className="mt-1 text-2xl font-black text-slate-900">
                  {amount.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  TL
                </h4>
                <p className="mt-1 text-xs text-muted-foreground">{Number(stat?.count ?? 0)} kayit</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusClasses[statusKey]}`}>
                {statusKey}
              </span>
            </button>
          );
        })}
      </div>

      {canViewFinancials && (categoryStats.some((s) => Number(s.total) > 0) || projectStats.some((s) => Number(s.total) > 0)) ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {categoryStats.some((s) => Number(s.total) > 0) ? (
            <div className="panel-section-card">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Kategori — Pasta grafik
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryStats
                      .filter((s) => Number(s.total) > 0)
                      .map((s) => ({
                        name: categoryLabels[s.category] || s.category,
                        value: Number(s.total),
                      }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${String(name ?? "")} ${(((percent ?? 0) as number) * 100).toFixed(0)}%`
                    }
                  >
                    {categoryStats
                      .filter((s) => Number(s.total) > 0)
                      .map((_, i) => (
                        <Cell key={`fin-pie-${i}`} fill={["#6366f1", "#10b981", "#f97316", "#a855f7", "#0ea5e9"][i % 5]} />
                      ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) =>
                      `${v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
                    }
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          {projectStats.some((s) => Number(s.total) > 0) ? (
            <div className="panel-section-card">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Proje — Bar grafik
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={projectStats
                    .filter((s) => Number(s.total) > 0)
                    .map((s) => ({
                      name: (s.project?.name || "Proje").slice(0, 20),
                      value: Number(s.total),
                    }))}
                  margin={{ top: 8, right: 8, left: 8, bottom: 48 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#33415522" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={68} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(v: number) =>
                      `${v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
                    }
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} name="Tutar" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="panel-section-card">
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
                    <div className="panel-progress-track">
                      <div className="h-full bg-indigo-500" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="panel-section-card">
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
                    <div className="panel-progress-track">
                      <div className="h-full bg-emerald-500" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="panel-filter-card space-y-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(260px,1fr)_minmax(360px,440px)_180px_180px_180px] xl:items-end">
          <label className="panel-field">
            <span className="panel-label">Arama</span>
            <div className="relative">
              <Search className="panel-control-icon" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && applyFilters()}
                className="panel-control pl-10"
                placeholder="Firma veya kisi ara"
              />
            </div>
          </label>

          <ProjectPeriodFilters
            projects={projects}
            selectedProjectId={projectId || "all"}
            selectedPeriodId={periodId}
            onProjectChange={(value) => {
              const project = projects.find((item) => String(item.id) === value);
              setProjectId(value === "all" ? "" : value);
              setPeriodId(value === "all" ? "all" : defaultPeriodIdForProject(project) || "all");
            }}
            onPeriodChange={setPeriodId}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          />

          <label className="panel-field">
            <span className="panel-label">Durum</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="panel-control"
            >
              <option value="">Tum durumlar</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="panel-field">
            <span className="panel-label">Kategori</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="panel-control"
            >
              <option value="">Tum kategoriler</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="panel-field">
            <span className="panel-label">Tur</span>
            <select
              value={transactionType}
              onChange={(event) => setTransactionType(event.target.value)}
              className="panel-control"
            >
              <option value="">Tum turler</option>
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_180px_auto] md:items-end">
          <label className="panel-field">
            <span className="panel-label">Baslangic</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="panel-control"
            />
          </label>
          <label className="panel-field">
            <span className="panel-label">Bitis</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="panel-control"
            />
          </label>
          <button
            type="button"
            onClick={applyFilters}
            className="panel-button panel-button-primary md:justify-self-start"
          >
            <Filter className="h-4 w-4" />
            Filtrele
          </button>
        </div>
      </div>
      <div className="panel-table-card">
        <div className="overflow-x-auto">
          <table className="panel-table">
            <thead>
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
            <tbody>
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
                  <tr key={transaction.id}>
                    <td className="px-6 py-4">
                      {new Date(transaction.submitted_at).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{transaction.project?.name || "-"}</div>
                      <div className="text-xs">
                        {categoryLabels[transaction.category] || transaction.category}
                      </div>
                      {transaction.category === "other" && transaction.category_note ? (
                        <div className="mt-1 text-[10px] font-semibold text-slate-500">Not: {transaction.category_note}</div>
                      ) : null}
                      {transaction.spending_unit ? (
                        <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Birim: {transaction.spending_unit}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{transaction.payee_name}</div>
                      <div className="mt-1 space-y-0.5 text-[10px] text-slate-400">
                        {transaction.invoice_no ? <p>Fatura: {transaction.invoice_no}</p> : null}
                        {transaction.accounting_code ? <p>Kod: {transaction.accounting_code}</p> : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-indigo-700">
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
                      {transaction.payment_date ? (
                        <div className="mt-1 text-[10px] text-slate-400">
                          {new Date(transaction.payment_date).toLocaleDateString("tr-TR")}
                          {transaction.payment_method ? ` / ${paymentMethodLabels[transaction.payment_method] || transaction.payment_method}` : ""}
                        </div>
                      ) : null}
                    </td>
                    <td className="space-x-2 px-6 py-4 text-right">
                      {canDownloadInvoice &&
                        transaction.invoice_path &&
                        transaction.project?.id != null &&
                        canAccessProject("financial.invoice.download", transaction.project.id) && (
                        <button
                          type="button"
                          onClick={() => void downloadInvoice(transaction.id, transaction.payee_name)}
                          className="panel-table-action panel-table-action-icon panel-table-action-info"
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
                              className="panel-table-action panel-table-action-icon panel-table-action-success"
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
                              className="panel-table-action panel-table-action-icon panel-table-action-danger"
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
                              className="panel-table-action panel-table-action-danger"
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
                          className="panel-table-action panel-table-action-success"
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
          <div className="panel-pagination">
            <button
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
              className="panel-button panel-button-secondary text-xs"
            >
              Onceki
            </button>
            <span className="panel-pagination-count">
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="panel-button panel-button-secondary text-xs"
            >
              Sonraki
            </button>
          </div>
        )}
      </div>
        </>
      ) : null}

      {activeTab === "new" && canCreateFinancials ? (
        <form onSubmit={handleSubmit} className="panel-section-card space-y-6">
          <div className="panel-form-grid">
            <div className="panel-field">
              <label className="panel-label">Proje</label>
              <select
                value={formProjectId}
                onChange={(event) => {
                  const nextProjectId = event.target.value;
                  const project = createProjects.find((item) => String(item.id) === nextProjectId);
                  setFormProjectId(nextProjectId);
                  setFormPeriodId(defaultPeriodIdForProject(project));
                }}
                required
                className="panel-control"
              >
                <option value="">Proje secin</option>
                {createProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              {createProjects.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Fatura yukleyebileceginiz bir proje bulunamadi.
                </p>
              ) : null}
            </div>

            <div className="panel-field">
              <label className="panel-label">Donem</label>
              <select
                value={formPeriodId}
                onChange={(event) => setFormPeriodId(event.target.value)}
                disabled={!formProjectId}
                className="panel-control"
              >
                <option value="">Aktif donem</option>
                {(createProjects.find((project) => String(project.id) === formProjectId)?.periods ?? []).map((period) => (
                  <option key={period.id} value={period.id}>{period.name}</option>
                ))}
              </select>
            </div>

            <div className="panel-field">
              <label className="panel-label">Kategori</label>
              <select
                value={formCategory}
                onChange={(event) => setFormCategory(event.target.value)}
                required
                className="panel-control"
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {formCategory === "other" ? (
              <div className="panel-field">
                <label className="panel-label">Diger kategori notu</label>
                <textarea
                  value={formCategoryNote}
                  onChange={(event) => setFormCategoryNote(event.target.value)}
                  required
                  rows={3}
                  className="panel-control min-h-24"
                  placeholder="Harcamanin kategorisini kisaca aciklayin"
                />
              </div>
            ) : null}

            <div className="panel-field">
              <label className="panel-label">
                Harcamayi Yapan Birim
              </label>
              <input
                value={formSpendingUnit}
                onChange={(event) => setFormSpendingUnit(event.target.value)}
                className="panel-control"
                placeholder="Orn: Medya Birimi, Pergel Ekibi"
              />
            </div>
          </div>

          <div className="panel-form-grid">
            <div className="panel-field">
              <label className="panel-label">
                Alici / Firma Adi
              </label>
              <input
                value={formPayee}
                onChange={(event) => setFormPayee(event.target.value)}
                required
                className="panel-control"
                placeholder="Orn: ABC Catering A.S."
              />
            </div>

            <div className="panel-field">
              <label className="panel-label">Fatura No</label>
              <input
                value={formInvoiceNo}
                onChange={(event) => setFormInvoiceNo(event.target.value)}
                className="panel-control"
                placeholder="Orn: FAT-2026-001"
              />
            </div>
          </div>

          <div className="panel-form-grid-3">
            <div className="panel-field">
              <label className="panel-label">Odeme Tarihi</label>
              <input
                type="date"
                value={formPaymentDate}
                onChange={(event) => setFormPaymentDate(event.target.value)}
                className="panel-control"
              />
            </div>

            <div className="panel-field">
              <label className="panel-label">Odeme Yontemi</label>
              <select
                value={formPaymentMethod}
                onChange={(event) => setFormPaymentMethod(event.target.value)}
                className="panel-control"
              >
                <option value="">Secilmedi</option>
                {Object.entries(paymentMethodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="panel-field">
              <label className="panel-label">Muhasebe Kodu</label>
              <input
                value={formAccountingCode}
                onChange={(event) => setFormAccountingCode(event.target.value)}
                className="panel-control"
                placeholder="Orn: 770.01"
              />
            </div>
          </div>

          <div className="panel-form-grid">
            <div className="panel-field">
              <label className="panel-label">Tutar (TL)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formAmount}
                onChange={(event) => setFormAmount(event.target.value)}
                required
                className="panel-control"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="panel-file-drop panel-field">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Upload className="h-4 w-4" />
              Fatura / Fis Belgesi
            </label>
            <input
              type="file"
              onChange={(event) => setFormFile(event.target.files?.[0] || null)}
              accept=".pdf,.jpg,.jpeg,.png"
              required
              className="panel-file-input"
            />
          </div>

          <div className="panel-modal-footer">
            <button
              type="submit"
              disabled={submitting || createProjects.length === 0}
              className="panel-button panel-button-primary h-11 px-6"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              Faturayi Gonder
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
