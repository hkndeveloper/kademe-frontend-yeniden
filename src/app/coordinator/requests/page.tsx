"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, Send, Upload, Download } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { useAuth } from "@/store/useAuth";

interface Project {
  id: number;
  name: string;
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
  status: "pending" | "in_progress" | "completed" | "rejected";
  created_at?: string;
  requester?: {
    id: number;
    name: string;
    surname: string;
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
  target_users: TargetUser[];
  request_types: string[];
  status_options: string[];
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

export default function CoordinatorRequestsPage() {
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
  const [form, setForm] = useState({
    type: "",
    target_unit: "",
    target_user_id: "",
    project_id: "",
    description: "",
  });
  const canUpdateRequestStatus = hasPermission("requests.update_status");
  const canUploadRequestResponse = hasPermission("requests.upload_response");

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const response = await api.get<RequestsResponse>("/requests");
        setRequests(response.data.requests ?? []);
        setProjects(response.data.projects ?? []);
        setTargetUsers(response.data.target_users ?? []);
        setRequestTypes(response.data.request_types ?? []);
        setTargetUnits(response.data.target_units ?? []);
      } catch (error) {
        console.error("Koordinator talep verileri yuklenemedi", error);
        setErrorMessage("Talep verileri yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadRequests();
  }, []);

  const myOpenRequests = useMemo(
    () => requests.filter((request) => request.status === "pending" || request.status === "in_progress"),
    [requests],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    setErrorMessage(null);

    try {
      const response = await api.post<{ message: string; request_item: RequestItem }>("/requests", {
        type: form.type,
        target_unit: form.target_unit || null,
        target_user_id: form.target_user_id ? Number(form.target_user_id) : null,
        project_id: form.project_id ? Number(form.project_id) : null,
        description: form.description,
      });

      setRequests((current) => [response.data.request_item, ...current]);
      setFeedback(response.data.message);
      setForm({
        type: "",
        target_unit: "",
        target_user_id: "",
        project_id: "",
        description: "",
      });
    } catch (error) {
      console.error("Talep olusturulamadi", error);
      setErrorMessage("Talep olusturulamadi. Alanlari kontrol edip tekrar dene.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (requestId: number, status: RequestItem["status"]) => {
    setUpdatingId(requestId);
    setFeedback(null);
    setErrorMessage(null);
    try {
      const response = await api.put<{ message: string; request_item: RequestItem }>(`/requests/${requestId}/status`, { status });
      setRequests((current) => current.map((req) => (req.id === requestId ? response.data.request_item : req)));
      setFeedback(response.data.message);
    } catch (error) {
      console.error("Talep durumu güncellenemedi", error);
      setErrorMessage("Talep durumu güncellenemedi.");
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
      const response = await api.post<{ message: string; request_item: RequestItem }>(`/requests/${requestId}/upload-response`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setRequests((current) => current.map((req) => (req.id === requestId ? response.data.request_item : req)));
      setFeedback(response.data.message);
    } catch (error) {
      console.error("Dosya yüklenemedi", error);
      setErrorMessage("Dosya yüklenemedi.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Talep Yonetimi</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Kaynak, belge ve operasyon talepleri</p>
        </div>
        <PermissionGate permission="requests.export">
          <ExportButtons endpoint="/requests/export" filename="koordinator_talepleri" buttonLabel="Talepleri Disa Aktar" />
        </PermissionGate>
      </div>

      {feedback ? <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-200">{feedback}</div> : null}
      {errorMessage ? <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">{errorMessage}</div> : null}

      <PermissionGate
        permissions={["requests.view", "requests.create"]}
        require="any"
        fallback={
        <div className="glass-panel rounded-3xl p-10 text-center text-sm text-muted-foreground">
          Bu modulu goruntulemek icin yetkiniz bulunmuyor.
        </div>
        }
      >
      {
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <PermissionGate permission="requests.create" fallback={<div className="glass-panel rounded-3xl p-8 text-sm text-muted-foreground">Yeni talep olusturma yetkiniz bulunmuyor.</div>}>
        <form className="glass-panel rounded-3xl p-8" onSubmit={handleSubmit}>
          <h2 className="mb-6 text-xl font-bold text-slate-900">Yeni Talep Olustur</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} required className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900">
              <option value="">Talep tipi sec</option>
              {requestTypes.map((type) => (
                <option key={type} value={type}>{typeLabels[type] || type}</option>
              ))}
            </select>
            <select value={form.project_id} onChange={(event) => setForm((current) => ({ ...current, project_id: event.target.value }))} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900">
              <option value="">Proje sec</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <select value={form.target_unit} onChange={(event) => setForm((current) => ({ ...current, target_unit: event.target.value }))} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900">
              <option value="">Hedef birim sec</option>
              {targetUnits.map((targetUnit) => (
                <option key={targetUnit} value={targetUnit}>{targetUnit}</option>
              ))}
            </select>
            <select value={form.target_user_id} onChange={(event) => setForm((current) => ({ ...current, target_user_id: event.target.value }))} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900">
              <option value="">Hedef kisi sec</option>
              {targetUsers.map((targetUser) => (
                <option key={targetUser.id} value={targetUser.id}>
                  {targetUser.name} {targetUser.surname} ({targetUser.role})
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            rows={6}
            required
            minLength={10}
            placeholder="Talebinin kapsamını, zaman ihtiyacını ve gerekli ayrıntıları yaz."
            className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-900"
          />

          <button type="submit" disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-accent px-6 py-3 font-bold text-accent-foreground disabled:opacity-60">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            Talebi Gonder
          </button>
        </form>
        </PermissionGate>

        <PermissionGate permission="requests.view">
        <div className="glass-panel rounded-3xl p-8">
          <h2 className="mb-6 text-xl font-bold text-slate-900">Acilik Durumu Yuksek Talepler</h2>
          {loading ? (
            <div className="flex min-h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
          ) : myOpenRequests.length === 0 ? (
            <div className="text-sm text-muted-foreground">Acik talep bulunmuyor.</div>
          ) : (
            <div className="space-y-4">
              {myOpenRequests.slice(0, 6).map((request) => (
                <div key={request.id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-bold text-slate-900">{typeLabels[request.type] || request.type}</div>
                      {canUpdateRequestStatus ? <select
                        value={request.status}
                        onChange={(e) => void handleStatusChange(request.id, e.target.value as RequestItem["status"])}
                        disabled={updatingId === request.id}
                        className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground outline-none"
                      >
                      <option value="pending">Beklemede</option>
                      <option value="in_progress">İşleniyor</option>
                      <option value="completed">Tamamlandı</option>
                      <option value="rejected">Reddedildi</option>
                      </select> : <span className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{request.status}</span>}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">{request.project?.name || "Genel"}{request.target_user ? ` -> ${request.target_user.name} ${request.target_user.surname}` : ""}</div>
                  <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {request.description}
                  </div>
                  <div className="mt-4 border-t border-white/5 pt-3">
                    {request.response_file_path ? (
                      <a 
                        href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/storage'}/${request.response_file_path.replace('public/', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent/20 px-3 py-2 text-xs font-bold text-accent-foreground hover:bg-accent hover:text-primary-foreground transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        Yanıt Belgesini İndir
                      </a>
                    ) : canUploadRequestResponse ? (
                      <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-white/10 hover:text-slate-900 transition-colors">
                        <Upload className="h-3 w-3" />
                        {updatingId === request.id ? "Yükleniyor..." : "Belge Yükle"}
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
      }
      </PermissionGate>
    </div>
  );
}
