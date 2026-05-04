"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Filter, Loader2, MessageSquare, Upload } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

interface Project {
  id: number;
  name: string;
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
  requester?: {
    id: number;
    name: string;
    surname: string;
    role: string;
  } | null;
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
  request_types: string[];
  status_options: Array<RequestItem["status"]>;
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

const statusLabels: Record<RequestItem["status"], string> = {
  pending: "Beklemede",
  in_progress: "Isleniyor",
  completed: "Tamamlandi",
  rejected: "Reddedildi",
};

export default function AdminRequestsPage() {
  const { hasPermission, canAccessProject } = usePermissions();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [requestTypes, setRequestTypes] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<Array<RequestItem["status"]>>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.get<RequestsResponse>("/requests", {
        params: {
          type: typeFilter || undefined,
          project_id: projectFilter || undefined,
        },
      });
      setRequests(response.data.requests ?? []);
      setProjects(response.data.projects ?? []);
      setRequestTypes(response.data.request_types ?? []);
      setStatusOptions(response.data.status_options ?? []);
    } catch (error) {
      console.error("Admin request verileri yuklenemedi", error);
      setErrorMessage("Talep verileri yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [projectFilter, typeFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRequests();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRequests]);

  const projectsInScope = useMemo(
    () => projects.filter((project) => canAccessProject("requests.view", project.id)),
    [projects, canAccessProject]
  );

  const canMutateRequest = (permission: string, request: RequestItem) =>
    hasPermission(permission) && (!request.project?.id || canAccessProject(permission, request.project.id));

  const visibleRequests = useMemo(
    () =>
      requests.filter((request) =>
        !request.project?.id ? hasPermission("requests.view") : canAccessProject("requests.view", request.project.id)
      ),
    [requests, hasPermission, canAccessProject]
  );

  const handleStatusChange = async (requestId: number, status: RequestItem["status"]) => {
    setUpdatingId(requestId);
    setFeedback(null);
    setErrorMessage(null);

    try {
      const response = await api.put<{ message: string; request_item: RequestItem }>(`/requests/${requestId}/status`, {
        status,
      });
      setRequests((current) => current.map((request) => (request.id === requestId ? response.data.request_item : request)));
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
        `/requests/${requestId}/upload-response`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      setRequests((current) => current.map((request) => (request.id === requestId ? response.data.request_item : request)));
      setFeedback(response.data.message);
    } catch (error) {
      console.error("Dosya yuklenemedi", error);
      setErrorMessage("Dosya yuklenemedi. Yetkiniz olmayabilir veya dosya cok buyuk olabilir.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDownloadResponseFile = async (requestItem: RequestItem) => {
    const endpoint = requestItem.response_file_download_url ?? (requestItem.response_file_path ? `/requests/${requestItem.id}/response-file` : null);
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
      console.error("Yanit belgesi indirilemedi", error);
      setErrorMessage("Yanit belgesi indirilemedi.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
            <MessageSquare className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Talep Yonetimi</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Merkezi talep listesi ve durum guncelleme
            </p>
          </div>
        </div>
        <PermissionGate permission="requests.export">
          <ExportButtons
            endpoint="/requests/export"
            filename="talep_kayitlari"
            params={{
              type: typeFilter || undefined,
              project_id: projectFilter || undefined,
            }}
            buttonLabel="Kayitlari Disa Aktar"
          />
        </PermissionGate>
      </div>

      {feedback ? (
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-200">{feedback}</div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">{errorMessage}</div>
      ) : null}

      <div className="glass-panel flex flex-col gap-4 rounded-3xl p-6 md:flex-row">
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900"
        >
          <option value="">Tum tipler</option>
          {requestTypes.map((requestType) => (
            <option key={requestType} value={requestType}>
              {typeLabels[requestType] || requestType}
            </option>
          ))}
        </select>

        <select
          value={projectFilter}
          onChange={(event) => setProjectFilter(event.target.value)}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900"
        >
          <option value="">Tum projeler</option>
          {projectsInScope.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => void loadRequests()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-indigo-700"
        >
          <Filter className="h-4 w-4" />
          Yenile
        </button>
      </div>

      <div className="glass-panel rounded-3xl p-8">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : visibleRequests.length === 0 ? (
          <div className="text-sm text-muted-foreground">Henuz talep kaydi bulunmuyor.</div>
        ) : (
          <div className="space-y-4">
            {visibleRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-white/5 bg-white/5 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="text-lg font-bold text-slate-900">{typeLabels[request.type] || request.type}</div>
                    <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      {request.project?.name || "Genel"}
                      {request.target_unit ? ` - ${request.target_unit}` : ""}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Talep sahibi:{" "}
                      {request.requester ? `${request.requester.name} ${request.requester.surname}` : "Bilinmiyor"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Hedef kisi: {request.target_user ? `${request.target_user.name} ${request.target_user.surname}` : "Atanmamis"}
                    </div>
                    <p className="pt-1 text-sm text-muted-foreground">{request.description}</p>
                  </div>

                  <div className="min-w-48">
                    <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Durum</label>
                    <select
                      value={request.status}
                      onChange={(event) => void handleStatusChange(request.id, event.target.value as RequestItem["status"])}
                      disabled={updatingId === request.id || !canMutateRequest("requests.update_status", request)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900"
                    >
                      {statusOptions.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusLabels[statusOption]}
                        </option>
                      ))}
                    </select>

                    <div className="mt-4 border-t border-white/5 pt-4">
                      {request.response_file_path ? (
                        <button
                          type="button"
                          onClick={() => void handleDownloadResponseFile(request)}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600/20 px-4 py-3 text-sm font-bold text-indigo-400 transition-colors hover:bg-indigo-600 hover:text-white"
                        >
                          <Download className="h-4 w-4" />
                          Belgeyi Indir
                        </button>
                      ) : (
                        <label
                          className={`flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-3 text-sm font-bold transition-colors ${
                            canMutateRequest("requests.upload_response", request)
                              ? "cursor-pointer text-muted-foreground hover:bg-white/10 hover:text-slate-900"
                              : "cursor-not-allowed opacity-40"
                          }`}
                        >
                          <Upload className="h-4 w-4" />
                          {updatingId === request.id ? "Yukleniyor..." : "Yanit Belgesi Yukle"}
                          <input
                            type="file"
                            className="hidden"
                            disabled={
                              updatingId === request.id || !canMutateRequest("requests.upload_response", request)
                            }
                            onChange={(event) => void handleFileUpload(request.id, event.target.files?.[0] || null)}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
