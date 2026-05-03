"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, Search, Filter, Loader2, Plus, Trash2, CheckCircle } from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { usePermissions } from "@/hooks/usePermissions";

interface Project {
  id: number;
  name: string;
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
  project?: { id: number; name: string };
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
  
  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ user_id: "", project_id: "", type: "participation" });
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
          merged.set(project.id, { id: project.id, name: project.name });
        });
        const raw = Array.from(merged.values());
        setProjects(raw.map((p) => ({ id: p.id, name: p.name })));
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
        params: { page, search, project_id: projectId }
      });
      setCertificates(res.data.certificates.data || []);
      setTotalPages(res.data.certificates.last_page || 1);
    } catch (error) {
      console.error("Sertifikalar yüklenemedi", error);
    } finally {
      setLoading(false);
    }
  }, [page, projectId, search]);

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
      await api.post("/panel/certificates", form);
      setIsModalOpen(false);
      setForm({ user_id: "", project_id: "", type: "participation" });
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

  const filterableProjects = useMemo(
    () => projects.filter((p) => canAccessProject("certificates.view", p.id)),
    [projects, canAccessProject]
  );

  const creatableProjects = useMemo(
    () => projects.filter((p) => canAccessProject("certificates.create", p.id)),
    [projects, canAccessProject]
  );

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
              params={{ search: search || undefined, project_id: projectId || undefined }}
              buttonLabel="Sertifikalari Disa Aktar"
            />
          ) : null}
          {canCreate ? (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-colors hover:bg-amber-400"
            >
              <Plus className="h-5 w-5" />
              Yeni Sertifika Oluştur
            </button>
          ) : null}
        </div>
      </div>

      <div className="glass-panel flex flex-col md:flex-row gap-4 rounded-3xl p-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-amber-500" 
            placeholder="Doğrulama kodu, isim veya e-posta ara..." 
          />
        </div>
        <select 
          value={projectId} 
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 min-w-[200px]"
        >
          <option value="">Tüm Projeler</option>
          {filterableProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button 
          onClick={applyFilters}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-black shadow-lg shadow-amber-500/20 hover:bg-amber-400"
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
                <th className="px-6 py-4">Öğrenci / Alıcı</th>
                <th className="px-6 py-4">Proje</th>
                <th className="px-6 py-4">Tür</th>
                <th className="px-6 py-4">Doğrulama Kodu</th>
                <th className="px-6 py-4">Veriliş Tarihi</th>
                <th className="px-6 py-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-500" />
                  </td>
                </tr>
              ) : certificates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    Sertifika bulunamadı.
                  </td>
                </tr>
              ) : (
                certificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{cert.user?.name} {cert.user?.surname}</div>
                      <div className="text-[10px] text-muted-foreground">{cert.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{cert.project?.name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-500">
                        {cert.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-900">{cert.verification_code}</td>
                    <td className="px-6 py-4">{new Date(cert.issued_at).toLocaleDateString('tr-TR')}</td>
                    <td className="px-6 py-4 text-right">
                      {canDelete && cert.project?.id != null && canAccessProject("certificates.delete", cert.project.id) ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(cert.id)}
                          className="inline-flex items-center gap-1 rounded-xl bg-red-500/10 p-2 text-xs font-bold text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                          title="İptal Et / Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
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
              onClick={() => setPage(p => p - 1)}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-900 disabled:opacity-50"
            >
              Önceki
            </button>
            <span className="text-xs font-bold text-muted-foreground">{page} / {totalPages}</span>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-900 disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        )}
      </div>

      {/* CREATE CERTIFICATE MODAL */}
      {isModalOpen && canCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleCreate} className="w-full max-w-md rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl p-6">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Sertifika Oluştur
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Kullanıcı (Öğrenci)</label>
                <select
                  required
                  value={form.user_id}
                  onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-amber-500"
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
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Proje</label>
                <select
                  required
                  value={form.project_id}
                  onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-amber-500"
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
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Tür</label>
                <select 
                  required
                  value={form.type} 
                  onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-amber-500"
                >
                  <option value="participation">Katilim Belgesi</option>
                  <option value="achievement">Basari / Onur Belgesi</option>
                  <option value="graduation">Mezuniyet Belgesi</option>
                </select>
              </div>
            </div>
            <div className="mt-8 flex items-center justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-bold text-muted-foreground hover:text-slate-900"
              >
                İptal
              </button>
              <button 
                type="submit" 
                disabled={creating}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
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

