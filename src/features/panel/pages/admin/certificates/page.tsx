"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, Search, Filter, Loader2, Plus, Trash2, CheckCircle, Upload, Download } from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { defaultPeriodIdForProject, periodHasWriteCapability, periodOptionById, periodsForProject, ProjectPeriodFilters, type PeriodOption } from "@/components/shared/ProjectPeriodFilters";
import { usePermissions } from "@/hooks/usePermissions";
import { downloadBlobResponse } from "@/lib/download";

interface Project {
  id: number;
  name: string;
  periods?: PeriodOption[];
  active_period?: PeriodOption | null;
}

interface User {
  id: number;
  name: string;
  surname: string;
  email: string;
}

interface Certificate {
  id: number;
  type: string;
  verification_code: string;
  issued_at: string;
  certificate_path?: string | null;
  download_url?: string | null;
  project?: { id: number; name: string };
  period?: PeriodOption | null;
  user?: { id: number; name: string; surname: string; email: string };
}

export default function AdminCertificatesPage() {
  const { hasPermission, canAccessProject } = usePermissions();
  const canExport = hasPermission("certificates.export");
  const canCreate = hasPermission("certificates.create");
  const canDelete = hasPermission("certificates.delete");
  const canListUsers = hasPermission("users.view");

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filter
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("project_id") ?? "";
  });
  const [periodId, setPeriodId] = useState(() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("period_id") ?? "all";
  });
  
  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ user_id: "", project_id: "", period_id: "", type: "participation" });
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const viewProjectsReq = hasPermission("certificates.view")
          ? api.get<{ projects?: Project[] }>("/panel/projects/manageable", { params: { permission: "certificates.view" } })
          : Promise.resolve({ data: { projects: [] as Project[] } });
        const createProjectsReq = hasPermission("certificates.create")
          ? api.get<{ projects?: Project[] }>("/panel/projects/manageable", { params: { permission: "certificates.create" } })
          : Promise.resolve({ data: { projects: [] as Project[] } });

        const usersReq =
          canListUsers && canCreate
            ? api.get<{ users?: { data?: User[] } }>("/panel/users", { params: { per_page: 500 } })
            : Promise.resolve({ data: { users: { data: [] as User[] } } });

        const [viewProjectsRes, createProjectsRes, usersRes] = await Promise.all([viewProjectsReq, createProjectsReq, usersReq]);
        const merged = new Map<number, Project>();
        [...(viewProjectsRes.data.projects ?? []), ...(createProjectsRes.data.projects ?? [])].forEach((project) => {
          const existing = merged.get(project.id);
          const periods = existing?.periods?.length ? existing.periods : project.periods;
          const activePeriod = existing?.active_period ?? project.active_period ?? null;

          merged.set(project.id, {
            id: project.id,
            name: project.name,
            periods,
            active_period: activePeriod,
          });
        });
        const raw = Array.from(merged.values());
        setProjects(raw);
        setUsers(usersRes.data.users?.data ?? []);
      } catch (error) {
        console.error("Filtre verileri yüklenemedi", error);
      }
    };
    void loadFilters();
  }, [hasPermission, canListUsers, canCreate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/panel/certificates", {
        params: {
          page,
          search,
          project_id: projectId || undefined,
          period_id: periodId !== "all" ? periodId : undefined,
        }
      });
      setCertificates(res.data.certificates.data || []);
      setTotalPages(res.data.certificates.last_page || 1);
    } catch (error) {
      console.error("Sertifikalar yüklenemedi", error);
    } finally {
      setLoading(false);
    }
  }, [page, periodId, projectId, search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  const applyFilters = () => {
    setPage(1);
    void loadData();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.user_id || !form.project_id || !form.type) return alert("Lütfen tüm alanları doldurun.");
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append("user_id", form.user_id);
      formData.append("project_id", form.project_id);
      if (form.period_id) formData.append("period_id", form.period_id);
      formData.append("type", form.type);
      if (certificateFile) {
        formData.append("certificate_file", certificateFile);
      }

      await api.post("/panel/certificates", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setIsModalOpen(false);
      setForm({ user_id: "", project_id: "", period_id: "", type: "participation" });
      setCertificateFile(null);
      applyFilters();
    } catch (error: unknown) {
      const msg = isAxiosError(error)
        ? String((error.response?.data as { message?: string })?.message ?? "Sertifika oluşturulamadı.")
        : "Sertifika oluşturulamadı.";
      alert(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Sertifikayı iptal etmek/silmek istediğinize emin misiniz?")) return;
    try {
      await api.delete(`/panel/certificates/${id}`);
      setCertificates(prev => prev.filter(c => c.id !== id));
    } catch {
      alert("Silinemedi.");
    }
  };

  const handleDownload = async (certificate: Certificate) => {
    if (!certificate.download_url) return;

    try {
      const endpoint = certificate.download_url.replace(/^.*\/api/, "");
      const response = await api.get(endpoint, { responseType: "blob" });
      await downloadBlobResponse(response.data, response.headers, `sertifika_${certificate.verification_code}`);
    } catch (error) {
      console.error("Sertifika indirilemedi", error);
      alert("Sertifika indirilemedi.");
    }
  };

  const filterableProjects = useMemo(
    () => projects.filter((p) => canAccessProject("certificates.view", p.id)),
    [projects, canAccessProject]
  );

  const creatableProjects = useMemo(
    () => projects.filter((p) => canAccessProject("certificates.create", p.id)),
    [projects, canAccessProject]
  );
  const selectedCreatePeriod = periodOptionById(projects, form.period_id || creatableProjects.find((project) => String(project.id) === form.project_id)?.active_period?.id);
  const canResolveSelectedPeriod = periodHasWriteCapability(selectedCreatePeriod, "resolve_operations");

  return (
    <div className="space-y-8">
      <div className="flex flex-col flex-wrap justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500">
            <Award className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Sertifika Yönetimi</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Kayıtlı ve Düzenlenmiş Tüm Sertifikalar</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canExport ? (
            <ExportButtons
              endpoint="/panel/certificates/export"
              filename="sertifikalar"
              params={{
                search: search || undefined,
                project_id: projectId || undefined,
                period_id: periodId !== "all" ? periodId : undefined,
              }}
              buttonLabel="Sertifikaları Dışa Aktar"
            />
          ) : null}
          {canCreate ? (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="panel-button panel-button-primary"
            >
              <Plus className="h-5 w-5" />
              Yeni Sertifika Oluştur
            </button>
          ) : null}
        </div>
      </div>

      <div className="panel-filter-card flex flex-col gap-4 md:flex-row md:items-end">
        <div className="relative flex-1">
          <Search className="panel-control-icon" />
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="panel-control pl-10" 
            placeholder="Doğrulama kodu, isim veya e-posta ara..." 
          />
        </div>
        <ProjectPeriodFilters
          projects={filterableProjects}
          selectedProjectId={projectId || "all"}
          selectedPeriodId={periodId}
          onProjectChange={(value) => {
            const normalizedValue = value === "all" ? "" : value;
            const project = filterableProjects.find((item) => String(item.id) === normalizedValue);
            setProjectId(normalizedValue);
            setPeriodId(normalizedValue ? defaultPeriodIdForProject(project) || "all" : "all");
          }}
          onPeriodChange={setPeriodId}
          className="grid flex-[2] grid-cols-1 gap-3 sm:grid-cols-2"
        />
        <button 
          onClick={applyFilters}
          className="panel-button panel-button-primary"
        >
          <Filter className="h-4 w-4" />
          Filtrele
        </button>
      </div>

      <div className="panel-table-card">
        <div className="overflow-x-auto">
          <table className="panel-table">
            <thead>
              <tr>
                <th className="px-6 py-4">Öğrenci / Alıcı</th>
                <th className="px-6 py-4">Proje</th>
                <th className="px-6 py-4">Dönem</th>
                <th className="px-6 py-4">Tür</th>
                <th className="px-6 py-4">Doğrulama Kodu</th>
                <th className="px-6 py-4">Veriliş Tarihi</th>
                <th className="px-6 py-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-500" />
                  </td>
                </tr>
              ) : certificates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    Sertifika bulunamadı.
                  </td>
                </tr>
              ) : (
                certificates.map((cert) => {
                  const canWriteCertificate = !cert.period?.id || periodHasWriteCapability(periodOptionById(projects, cert.period.id), "create_operations");
                  return (
                  <tr key={cert.id}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{cert.user?.name} {cert.user?.surname}</div>
                      <div className="text-[10px] text-muted-foreground">{cert.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{cert.project?.name || '-'}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-600">{cert.period?.name || 'Genel'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-500">
                        {cert.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-900">{cert.verification_code}</td>
                    <td className="px-6 py-4">{new Date(cert.issued_at).toLocaleDateString('tr-TR')}</td>
                    <td className="px-6 py-4 text-right">
                      {cert.download_url ? (
                        <button
                          type="button"
                          onClick={() => void handleDownload(cert)}
                          className="panel-table-action panel-table-action-icon panel-table-action-success mr-2"
                          title="Indir"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      ) : null}
                      {canDelete && cert.project?.id != null && canAccessProject("certificates.delete", cert.project.id) ? (
                        <button
                          type="button"
                          disabled={!canWriteCertificate}
                          onClick={() => handleDelete(cert.id)}
                          className="panel-table-action panel-table-action-icon panel-table-action-danger disabled:cursor-not-allowed disabled:opacity-40"
                          title={!canWriteCertificate ? "Bu dönem normal değişikliklere kapalıdır." : "İptal Et / Sil"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="panel-pagination">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="panel-button panel-button-secondary text-xs"
            >
              Önceki
            </button>
            <span className="panel-pagination-count">{page} / {totalPages}</span>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="panel-button panel-button-secondary text-xs"
            >
              Sonraki
            </button>
          </div>
        )}
      </div>

      {/* CREATE CERTIFICATE MODAL */}
      {isModalOpen && canCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <form onSubmit={handleCreate} className="panel-modal-card w-full max-w-lg">
            <div className="panel-modal-header">
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
              <Award className="h-5 w-5 text-amber-500" />
              Sertifika Oluştur
            </h2>
            </div>
            <div className="panel-modal-body space-y-4">
              <div>
                <label className="panel-label">Kullanıcı (Öğrenci)</label>
                <select
                  required
                  value={form.user_id}
                  onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}
                  className="panel-control"
                  disabled={!canListUsers}
                >
                  <option value="">Seçiniz...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.surname} ({u.email})
                    </option>
                  ))}
                </select>
                {!canListUsers ? (
                  <p className="mt-1 text-[10px] text-amber-500/90">
                    Kullanıcı listesi için users.view gerekir; yine de API proje kapsamını doğrular.
                  </p>
                ) : null}
              </div>
              <div>
                <label className="panel-label">Proje</label>
                <select
                  required
                  value={form.project_id}
                  onChange={(e) => {
                    const value = e.target.value;
                    const project = creatableProjects.find((item) => String(item.id) === value);
                    setForm((f) => ({ ...f, project_id: value, period_id: defaultPeriodIdForProject(project) }));
                  }}
                  className="panel-control"
                >
                  <option value="">Seçiniz...</option>
                  {creatableProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="panel-label">Dönem</label>
                <select
                  value={form.period_id}
                  onChange={(e) => setForm((f) => ({ ...f, period_id: e.target.value }))}
                  disabled={!form.project_id}
                  className="panel-control"
                >
                  <option value="">Dönem seçmeden oluştur</option>
                  {periodsForProject(creatableProjects.find((project) => String(project.id) === form.project_id)).map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.name}{period.status === "active" ? " (aktif)" : period.status === "completed" ? " (tamamlandı)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="panel-label">Tür</label>
                <select 
                  required
                  value={form.type} 
                  onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                  className="panel-control"
                >
                  <option value="participation">Katılım Belgesi</option>
                  <option value="achievement">Başarı / Onur Belgesi</option>
                  <option value="graduation">Mezuniyet Belgesi</option>
                </select>
              </div>
              <div>
                <label className="panel-label">
                  Sertifika Dosyası
                </label>
                <label className="panel-file-drop flex cursor-pointer items-center gap-3 text-sm font-bold text-slate-700">
                  <Upload className="h-4 w-4 text-amber-500" />
                  <span className="truncate">{certificateFile ? certificateFile.name : "PDF veya görsel seç"}</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(event) => setCertificateFile(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>
            <div className="panel-modal-footer mx-6 mb-6">
              <button 
                type="button" 
                onClick={() => {
                  setIsModalOpen(false);
                  setCertificateFile(null);
                }}
                className="panel-button panel-button-secondary"
              >
                İptal
              </button>
              <button 
                type="submit" 
                disabled={creating || !canResolveSelectedPeriod}
                title={!canResolveSelectedPeriod && form.project_id ? "Seçili dönemde sertifika oluşturulamaz." : undefined}
                className="panel-button panel-button-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Oluştur
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
