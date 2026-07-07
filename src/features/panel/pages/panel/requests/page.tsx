"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Download, FileText, Loader2, Send, Upload } from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { defaultPeriodIdForProject, periodsForProject, type PeriodOption } from "@/components/shared/ProjectPeriodFilters";
import { useAuth } from "@/store/useAuth";

interface Project {
  id: number;
  name: string;
  periods?: PeriodOption[];
  active_period?: PeriodOption | null;
}

interface TargetUser {
  id: number;
  name: string;
  surname: string;
  role: string;
}

interface RequestItem {
  id: number;
  type: string;
  target_unit?: string | null;
  description: string;
  response_file_path?: string | null;
  response_file_url?: string | null;
  response_file_download_url?: string | null;
  status: "pending" | "in_progress" | "completed" | "rejected";
  period?: PeriodOption | null;
  target_user?: {
    id: number;
    name: string;
    surname: string;
    role: string;
  } | null;
  project?: Project | null;
}

interface RequestsResponse {
  requests: RequestItem[];
  projects: Project[];
  target_users: TargetUser[];
  request_types: string[];
  target_units: string[];
}

const typeLabels: Record<string, string> = {
  vehicle: "Arac",
  food: "Yemek",
  accommodation: "Konaklama",
  ticket: "Bilet",
  official_doc: "Resmi Evrak",
  media_design: "Medya ve Tasarim",
  other: "Diger",
};

const targetUnitLabels: Record<string, string> = {
  media: "Medya / Tasarim",
  operations: "Operasyon",
  program: "Program / Proje",
  finance: "Finans",
  official_affairs: "Resmi Evrak",
  general: "Genel",
};

export default function PanelSharedRequestsPage() {
  const { hasPermission } = useAuth();

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [targetUsers, setTargetUsers] = useState<TargetUser[]>([]);
  const [requestTypes, setRequestTypes] = useState<string[]>([]);
  const [targetUnits, setTargetUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [form, setForm] = useState({
    type: "",
    target_unit: "",
    target_user_id: "",
    project_id: "",
    period_id: "",
    description: "",
  });

  const canUpdateRequestStatus = hasPermission("requests.update_status");
  const canUploadRequestResponse = hasPermission("requests.upload_response");
  const isResponder = canUpdateRequestStatus || canUploadRequestResponse;
  const filterProject = useMemo(
    () => projects.find((project) => String(project.id) === projectFilter),
    [projectFilter, projects]
  );
  const formProject = useMemo(
    () => projects.find((project) => String(project.id) === form.project_id),
    [form.project_id, projects]
  );
  const filterPeriods = useMemo(() => periodsForProject(filterProject), [filterProject]);
  const formPeriods = useMemo(() => periodsForProject(formProject), [formProject]);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const response = await api.get<RequestsResponse>("/panel/requests", {
          params: {
            status: statusFilter || undefined,
            project_id: projectFilter || undefined,
            period_id: periodFilter !== "all" ? periodFilter : undefined,
          },
        });
        setRequests(response.data.requests ?? []);
        setProjects(response.data.projects ?? []);
        setTargetUsers(response.data.target_users ?? []);
        setRequestTypes(response.data.request_types ?? []);
        setTargetUnits(response.data.target_units ?? []);
      } catch (error) {
        console.error("Talep verileri yuklenemedi", error);
        setErrorMessage("Talep verileri yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };
    void loadRequests();
  }, [periodFilter, projectFilter, statusFilter]);

  const visibleRequests = useMemo(() => {
    return requests.filter((request) => {
      const statusMatches = !statusFilter || request.status === statusFilter;
      const projectMatches = !projectFilter || String(request.project?.id ?? "") === projectFilter;
      const periodMatches = periodFilter === "all" || String(request.period?.id ?? "") === periodFilter;
      return statusMatches && projectMatches && periodMatches;
    });
  }, [periodFilter, projectFilter, requests, statusFilter]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    setErrorMessage(null);

    try {
      const response = await api.post<{ message: string; request_item: RequestItem }>("/panel/requests", {
        type: form.type,
        target_unit: form.target_unit || null,
        target_user_id: form.target_user_id ? Number(form.target_user_id) : null,
        project_id: form.project_id ? Number(form.project_id) : null,
        period_id: form.period_id ? Number(form.period_id) : null,
        description: form.description,
      });

      setRequests((current) => [response.data.request_item, ...current]);
      setFeedback(response.data.message);
      setForm({ type: "", target_unit: "", target_user_id: "", project_id: "", period_id: "", description: "" });
    } catch (error) {
      console.error("Talep olusturulamadi", error);
      setErrorMessage("Talep olusturulamadi.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (requestId: number, status: RequestItem["status"]) => {
    setUpdatingId(requestId);
    setFeedback(null);
    setErrorMessage(null);
    try {
      const response = await api.put<{ message: string; request_item: RequestItem }>(`/panel/requests/${requestId}/status`, { status });
      setRequests((current) => current.map((req) => (req.id === requestId ? response.data.request_item : req)));
      setFeedback(response.data.message);
    } catch (error) {
      console.error("Talep durumu guncellenemedi", error);
      setErrorMessage("Talep durumu guncellenemedi.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleFileUpload = async (requestId: number, file: File | null) => {
    if (!file) return;
    setUpdatingId(requestId);
    setFeedback(null);
    setErrorMessage(null);
    const formData = new FormData();
    formData.append("response_file", file);
    try {
      const response = await api.post<{ message: string; request_item: RequestItem }>(
        `/panel/requests/${requestId}/upload-response`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setRequests((current) => current.map((req) => (req.id === requestId ? response.data.request_item : req)));
      setFeedback(response.data.message);
    } catch (error) {
      console.error("Dosya yuklenemedi", error);
      setErrorMessage("Dosya yuklenemedi.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDownloadResponseFile = async (requestItem: RequestItem) => {
    const endpoint = requestItem.response_file_path ? `/panel/requests/${requestItem.id}/response-file` : null;
    if (!endpoint) return;

    try {
      const response = await api.get(endpoint, { responseType: "blob" });
      const contentType = String(response.headers["content-type"] ?? "");

      if (contentType.includes("application/json")) {
        const payload = JSON.parse(await response.data.text()) as { download_url?: string; message?: string };
        if (payload.download_url) {
          window.open(payload.download_url, "_blank", "noopener,noreferrer");
          return;
        }
        throw new Error(payload.message ?? "Yanit belgesi indirilemedi.");
      }

      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `talep_yanit_${requestItem.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      if (isAxiosError(error)) {
        if (error.response?.status === 403) {
          setErrorMessage("Bu talep yanit belgesini indirme yetkiniz bulunmuyor.");
          return;
        }
        if (error.response?.status === 404) {
          setErrorMessage("Yanit belgesi bulunamadi veya silinmis olabilir.");
          return;
        }
      }
      console.error("Yanit belgesi indirilemedi", error);
      setErrorMessage("Yanit belgesi indirilemedi.");
    }
  };
  const accentSoft = "bg-accent/20 text-accent-foreground";
  const exportName = "panel_talepler";

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accentSoft}`}>
            <FileText className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Talepler</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Gercek talep olusturma ve durum takibi</p>
          </div>
        </div>
        <PermissionGate permission="requests.export">
          <ExportButtons
            endpoint="/panel/requests/export"
            filename={exportName}
            params={{
              status: statusFilter || undefined,
              project_id: projectFilter || undefined,
              period_id: periodFilter !== "all" ? periodFilter : undefined,
            }}
            buttonLabel="Talepleri Disa Aktar"
          />
        </PermissionGate>
      </div>

      {feedback ? <div className="panel-notice panel-notice-success">{feedback}</div> : null}
      {errorMessage ? <div className="panel-notice panel-notice-error">{errorMessage}</div> : null}

      <PermissionGate
        permissions={["requests.view", "requests.create"]}
        require="any"
        fallback={<div className="panel-empty-card">Bu modulu goruntulemek icin yetkiniz bulunmuyor.</div>}
      >
        <div className={`grid grid-cols-1 gap-8 ${isResponder ? "lg:grid-cols-[1fr_1fr]" : "lg:grid-cols-[1.05fr_0.95fr]"}`}>
          <PermissionGate permission="requests.create" fallback={<div className="panel-empty-card text-left">Yeni talep olusturma yetkiniz bulunmuyor.</div>}>
            <form className="panel-section-card" onSubmit={handleSubmit}>
              <h2 className="mb-4 text-lg font-bold text-slate-900">Yeni Talep Olustur</h2>
              <div className="panel-form-grid">
                <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} required className="panel-control">
                  <option value="">Talep tipi sec</option>
                  {requestTypes.map((type) => <option key={type} value={type}>{typeLabels[type] || type}</option>)}
                </select>
                <select
                  value={form.project_id}
                  onChange={(event) => {
                    const value = event.target.value;
                    const project = projects.find((item) => String(item.id) === value);
                    setForm((current) => ({
                      ...current,
                      project_id: value,
                      period_id: value ? defaultPeriodIdForProject(project) : "",
                    }));
                  }}
                  className="panel-control"
                >
                  <option value="">Proje sec</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
                <select
                  value={form.period_id}
                  onChange={(event) => setForm((current) => ({ ...current, period_id: event.target.value }))}
                  disabled={!form.project_id || formPeriods.length === 0}
                  className="panel-control"
                >
                  <option value="">{form.project_id ? "Donem secmeden gonder" : "Proje secince donem"}</option>
                  {formPeriods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.name}
                      {period.status === "active" ? " (aktif)" : period.status === "completed" ? " (tamamlandi)" : ""}
                    </option>
                  ))}
                </select>
                <select value={form.target_unit} onChange={(event) => setForm((current) => ({ ...current, target_unit: event.target.value }))} className="panel-control">
                  <option value="">Hedef birim sec</option>
                  {targetUnits.map((targetUnit) => <option key={targetUnit} value={targetUnit}>{targetUnitLabels[targetUnit] || targetUnit}</option>)}
                </select>
                <select value={form.target_user_id} onChange={(event) => setForm((current) => ({ ...current, target_user_id: event.target.value }))} className="panel-control">
                  <option value="">Hedef kisi sec</option>
                  {targetUsers.map((targetUser) => <option key={targetUser.id} value={targetUser.id}>{targetUser.name} {targetUser.surname} ({targetUser.role})</option>)}
                </select>
              </div>

              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={6}
                required
                minLength={10}
                placeholder="Ihtiyacini ve gerekli ayrintilari yaz."
                className="panel-textarea mt-4"
              />

              <button type="submit" disabled={saving} className="panel-button panel-button-primary mt-6 h-11 px-6">
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                Talebi Gonder
              </button>
            </form>
          </PermissionGate>

          <PermissionGate permission="requests.view">
            <div className="panel-section-card">
              <h2 className="mb-4 text-lg font-bold text-slate-900">
                {isResponder ? "Bana Dusebilecek Talepler" : "Talepler"}
              </h2>
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="panel-control"
                >
                  <option value="">Tum durumlar</option>
                  <option value="pending">Beklemede</option>
                  <option value="in_progress">Isleniyor</option>
                  <option value="completed">Tamamlandi</option>
                  <option value="rejected">Reddedildi</option>
                </select>
                <select
                  value={projectFilter}
                  onChange={(event) => {
                    const value = event.target.value;
                    const project = projects.find((item) => String(item.id) === value);
                    setProjectFilter(value);
                    setPeriodFilter(value ? defaultPeriodIdForProject(project) || "all" : "all");
                  }}
                  className="panel-control"
                >
                  <option value="">Tum projeler</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <select
                  value={periodFilter}
                  onChange={(event) => setPeriodFilter(event.target.value)}
                  disabled={!projectFilter || filterPeriods.length === 0}
                  className="panel-control"
                >
                  <option value="all">{projectFilter ? "Tum donemler" : "Proje secince donem"}</option>
                  {filterPeriods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.name}
                      {period.status === "active" ? " (aktif)" : period.status === "completed" ? " (tamamlandi)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              {loading ? (
                <div className="flex min-h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              ) : visibleRequests.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Secili filtrelerle talep bulunmuyor.
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleRequests.map((request) => (
                    <div key={request.id} className="panel-list-card p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-bold text-slate-900">{typeLabels[request.type] || request.type}</div>
                        {canUpdateRequestStatus ? (
                          <select
                            value={request.status}
                            onChange={(e) => void handleStatusChange(request.id, e.target.value as RequestItem["status"])}
                            disabled={updatingId === request.id}
                            className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600 outline-none"
                          >
                            <option value="pending">Beklemede</option>
                            <option value="in_progress">Isleniyor</option>
                            <option value="completed">Tamamlandi</option>
                            <option value="rejected">Reddedildi</option>
                          </select>
                        ) : (
                          <span className="panel-chip">{request.status}</span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {request.project?.name || "Genel"}
                        {request.period?.name ? ` / ${request.period.name}` : ""}
                        {request.target_unit ? ` -> ${targetUnitLabels[request.target_unit] || request.target_unit}` : ""}
                        {request.target_user ? ` -> ${request.target_user.name} ${request.target_user.surname}` : ""}
                        {isResponder && !request.target_user ? " -> Birim havuzu" : ""}
                      </div>
                      <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        {request.description}
                      </div>
                      <div className="mt-4 border-t border-slate-200 pt-3">
                        {request.response_file_path ? (
                          <button
                            type="button"
                            onClick={() => void handleDownloadResponseFile(request)}
                            className="panel-card-action panel-card-action-primary w-full"
                          >
                            <Download className="h-3 w-3" />
                            Yanit belgesini indir
                          </button>
                        ) : canUploadRequestResponse ? (
                          <label className="panel-file-drop flex w-full cursor-pointer items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-600">
                            <Upload className="h-3 w-3" />
                            {updatingId === request.id ? "Yukleniyor..." : "Belge yukle"}
                            <input
                              type="file"
                              className="hidden"
                              disabled={updatingId === request.id}
                              onChange={(e) => void handleFileUpload(request.id, e.target.files?.[0] || null)}
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                            />
                          </label>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Belge yetkisi yok</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PermissionGate>
        </div>
      </PermissionGate>
    </div>
  );
}
