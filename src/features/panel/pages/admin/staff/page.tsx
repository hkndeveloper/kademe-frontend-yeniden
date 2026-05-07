"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Calendar,
  CheckCircle,
  Download,
  FileText,
  Filter,
  Loader2,
  Search,
  Upload,
  UserCog,
  UserPlus,
  FolderKanban,
  X,
  XCircle,
} from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

interface StaffProfile {
  title: string | null;
  unit: string | null;
  contract_type: string | null;
  start_date: string | null;
  personal_documents?: Array<{ path: string; url?: string | null; label: string; uploaded_at: string }> | null;
}

interface ProjectAssignment {
  id: number;
  name: string;
  assignment_type?: "coordinator" | "staff";
}

interface RoleOption {
  name: string;
  label: string;
}

interface StaffUser {
  id: number;
  name: string;
  surname: string;
  email: string;
  phone: string | null;
  role: string;
  staff_profile: StaffProfile | null;
  projects?: ProjectAssignment[];
  coordinated_projects?: ProjectAssignment[];
  assigned_projects?: ProjectAssignment[];
}

interface LeaveRequest {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  user?: { name: string; surname: string; email: string; role: string } | null;
  approver?: { name: string; surname: string } | null;
}

interface ActiveStaffItem {
  id: number;
  name: string;
  surname: string;
  email: string;
  role: string;
}

interface ActiveStats {
  active_staff: ActiveStaffItem[];
  on_leave: ActiveStaffItem[];
}

type StaffDetail = StaffUser;

export default function AdminStaffPage() {
  const { hasPermission, hasGlobalScope } = usePermissions();
  const [activeTab, setActiveTab] = useState<"staff" | "leaves">("staff");
  const [staffLoading, setStaffLoading] = useState(false);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffRole, setStaffRole] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [projectOptions, setProjectOptions] = useState<ProjectAssignment[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveStatus, setLeaveStatus] = useState("");
  const [activeStats, setActiveStats] = useState<ActiveStats>({ active_staff: [], on_leave: [] });
  const [selectedStaff, setSelectedStaff] = useState<StaffDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [savingProjects, setSavingProjects] = useState(false);
  const [coordinatedProjectIds, setCoordinatedProjectIds] = useState<number[]>([]);
  const [assignedProjectIds, setAssignedProjectIds] = useState<number[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createRoles, setCreateRoles] = useState<RoleOption[]>([]);
  const [createRolesLoading, setCreateRolesLoading] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createProjectIds, setCreateProjectIds] = useState<number[]>([]);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState({
    name: "",
    surname: "",
    email: "",
    phone: "",
    role: "",
    unit: "Genel",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const canManageProjectAssignments = hasPermission("staff.update") && hasGlobalScope("staff.update");

  const loadActiveStats = useCallback(async () => {
    try {
      const res = await api.get<ActiveStats>("/panel/staff/active");
      setActiveStats(res.data);
    } catch (error) {
      console.error("Aktif personel istatistikleri yuklenemedi", error);
    }
  }, []);

  const loadStaff = useCallback(async () => {
    setStaffLoading(true);
    setErrorMessage("");
    try {
      const res = await api.get("/panel/staff", {
        params: { search: staffSearch, role: staffRole, project_id: projectFilter || undefined },
      });
      setStaff(res.data?.staff?.data || []);
    } catch (error) {
      console.error("Personel listesi yuklenemedi", error);
      setErrorMessage("Personel listesi yuklenirken bir hata olustu.");
    } finally {
      setStaffLoading(false);
    }
  }, [projectFilter, staffRole, staffSearch]);

  const loadProjectOptions = useCallback(async () => {
    if (!hasPermission("projects.view")) {
      return;
    }
    setProjectsLoading(true);
    try {
      const res = await api.get<{ projects: ProjectAssignment[] }>("/panel/projects/manageable", {
        params: { permission: "projects.view" },
      });
      setProjectOptions((res.data?.projects ?? []).map((p) => ({ id: p.id, name: p.name })));
    } catch (error) {
      console.error("Proje listesi yuklenemedi", error);
      setProjectOptions([]);
    } finally {
      setProjectsLoading(false);
    }
  }, [hasPermission]);

  const loadLeaves = useCallback(async () => {
    setLeavesLoading(true);
    setErrorMessage("");
    try {
      const res = await api.get("/panel/leave-requests", {
        params: { status: leaveStatus },
      });
      setLeaves(res.data?.leave_requests?.data || []);
    } catch (error) {
      console.error("Izin talepleri yuklenemedi", error);
      setErrorMessage("Izin talepleri yuklenirken bir hata olustu.");
    } finally {
      setLeavesLoading(false);
    }
  }, [leaveStatus]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadActiveStats();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadActiveStats]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProjectOptions();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadProjectOptions]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (activeTab === "staff") {
        void loadStaff();
      } else {
        void loadLeaves();
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [activeTab, loadLeaves, loadStaff]);

  const openStaffModal = async (id: number) => {
    setIsModalOpen(true);
    setModalLoading(true);
    setErrorMessage("");
    try {
      const res = await api.get(`/panel/staff/${id}`);
      setSelectedStaff(res.data.staff);
      setCoordinatedProjectIds((res.data.staff?.coordinated_projects ?? []).map((p: ProjectAssignment) => p.id));
      setAssignedProjectIds((res.data.staff?.assigned_projects ?? []).map((p: ProjectAssignment) => p.id));
    } catch (error) {
      console.error("Personel detaylari yuklenemedi", error);
      setErrorMessage("Personel detaylari yuklenemedi.");
      setSelectedStaff(null);
    } finally {
      setModalLoading(false);
    }
  };

  const toggleProjectId = (kind: "coordinator" | "staff", projectId: number) => {
    const setter = kind === "coordinator" ? setCoordinatedProjectIds : setAssignedProjectIds;
    setter((prev) => (prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]));
  };

  const handleSaveProjects = async () => {
    if (!selectedStaff) return;
    setSavingProjects(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const res = await api.put<{ message?: string; staff: StaffDetail }>(`/panel/staff/${selectedStaff.id}/projects`, {
        coordinated_project_ids: selectedStaff.role === "coordinator" ? coordinatedProjectIds : [],
        assigned_project_ids: selectedStaff.role === "coordinator" ? [] : assignedProjectIds,
      });
      setSelectedStaff(res.data.staff);
      setCoordinatedProjectIds((res.data.staff.coordinated_projects ?? []).map((p) => p.id));
      setAssignedProjectIds((res.data.staff.assigned_projects ?? []).map((p) => p.id));
      setSuccessMessage(res.data.message ?? "Proje atamalari guncellendi.");
      await loadStaff();
    } catch (error) {
      console.error("Proje atamalari kaydedilemedi", error);
      setErrorMessage("Proje atamalari kaydedilemedi.");
    } finally {
      setSavingProjects(false);
    }
  };

  const roleOptions = Array.from(new Set(staff.map((item) => item.role).filter(Boolean))).sort();

  const openCreateModal = () => {
    setCreateOpen(true);
    setCreateError("");
    setCreateProjectIds([]);
    setCreateForm({ name: "", surname: "", email: "", phone: "", role: "", unit: "Genel" });
    setCreateRolesLoading(true);
    void api
      .get<{ roles: RoleOption[] }>("/panel/staff/create-options")
      .then((res) => {
        const roles = res.data?.roles ?? [];
        setCreateRoles(roles);
        setCreateForm((prev) => ({ ...prev, role: roles[0]?.name ?? "" }));
      })
      .catch(() => {
        setCreateError("Rol listesi yuklenemedi. Yetkinizi kontrol edin.");
        setCreateRoles([]);
      })
      .finally(() => setCreateRolesLoading(false));
  };

  const toggleCreateProject = (projectId: number) => {
    setCreateProjectIds((prev) => (prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]));
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!createForm.name.trim() || !createForm.surname.trim() || !createForm.email.trim() || !createForm.role) {
      setCreateError("Ad, soyad, e-posta ve rol zorunludur.");
      return;
    }
    setCreateSubmitting(true);
    try {
      const payload = {
        name: createForm.name.trim(),
        surname: createForm.surname.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim() || undefined,
        role: createForm.role,
        unit: createForm.unit.trim() || "Genel",
        project_ids: createProjectIds,
      };
      const res = await api.post<{ message?: string }>("/panel/staff", payload);
      setSuccessMessage(res.data?.message ?? "Calisan olusturuldu.");
      setCreateOpen(false);
      await loadStaff();
      await loadActiveStats();
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
        const fromErrors = data?.errors ? Object.values(data.errors).flat().filter(Boolean).join(" ") : "";
        setCreateError(data?.message || fromErrors || "Calisan olusturulamadi.");
      } else {
        setCreateError("Calisan olusturulamadi.");
      }
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStaff) return;

    setUploadingDoc(true);
    setErrorMessage("");
    setSuccessMessage("");
    const formData = new FormData();
    formData.append("document", file);
    formData.append("label", file.name);

    try {
      const res = await api.post(`/panel/staff/${selectedStaff.id}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSelectedStaff((prev) =>
        prev
          ? {
              ...prev,
              staff_profile: {
                ...(prev.staff_profile || {
                  title: null,
                  unit: null,
                  contract_type: null,
                  start_date: null,
                }),
                personal_documents: res.data.documents || [],
              },
            }
          : prev,
      );
      setSuccessMessage("Belge basariyla yuklendi.");
    } catch (error) {
      console.error("Belge yuklenemedi", error);
      setErrorMessage("Belge yuklenemedi.");
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  const handleLeaveAction = async (id: number, action: "approve" | "reject") => {
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await api.put(`/panel/leave-requests/${id}/${action}`);
      setSuccessMessage(action === "approve" ? "Izin talebi onaylandi." : "Izin talebi reddedildi.");
      await loadLeaves();
      await loadActiveStats();
    } catch (error) {
      console.error("Izin islemi basarisiz", error);
      setErrorMessage("Izin islemi tamamlanamadi.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
            <UserCog className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Personel Yonetimi</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Kadro, ozluk ve izin surecleri
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canManageProjectAssignments ? (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-indigo-600 transition-colors hover:bg-indigo-600 hover:text-white"
            >
              <UserPlus className="h-4 w-4" />
              Yeni Calisan
            </button>
          ) : null}
          <a
            href="http://kademepuantaj.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700"
          >
            <Calendar className="h-5 w-5" />
            Aylik Puantaj
          </a>
          {activeTab === "staff" ? (
            <PermissionGate permission="staff.export">
              <ExportButtons
                endpoint="/panel/staff/export"
                filename="personel_listesi"
                params={{
                  role: staffRole || undefined,
                  search: staffSearch || undefined,
                  project_id: projectFilter || undefined,
                }}
                buttonLabel="Personeli Disa Aktar"
              />
            </PermissionGate>
          ) : (
            <PermissionGate permission="staff.export">
              <ExportButtons
                endpoint="/panel/leave-requests/export"
                filename="izin_talepleri"
                params={{
                  status: leaveStatus || undefined,
                }}
                buttonLabel="Izinleri Disa Aktar"
              />
            </PermissionGate>
          )}
        </div>
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

      <div className="flex space-x-1 rounded-2xl bg-black/40 p-1 md:w-max">
        <button
          onClick={() => setActiveTab("staff")}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all ${
            activeTab === "staff"
              ? "bg-indigo-600 text-white shadow-lg"
              : "text-muted-foreground hover:bg-white/5 hover:text-slate-900"
          }`}
        >
          <BriefcaseBusiness className="h-4 w-4" />
          Personel Listesi
        </button>
        <button
          onClick={() => setActiveTab("leaves")}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all ${
            activeTab === "leaves"
              ? "bg-indigo-600 text-white shadow-lg"
              : "text-muted-foreground hover:bg-white/5 hover:text-slate-900"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Izin Talepleri
        </button>
      </div>

      {activeTab === "staff" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="glass-panel flex items-center justify-between rounded-3xl p-6">
              <div>
                <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Aktif Calisanlar</div>
                <div className="mt-2 text-3xl font-black text-emerald-400">{activeStats.active_staff.length}</div>
                <div className="mt-1 text-xs text-muted-foreground">Son 8 saatte aktif olanlar</div>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <BriefcaseBusiness className="h-8 w-8" />
              </div>
            </div>
            <div className="glass-panel flex items-center justify-between rounded-3xl p-6">
              <div>
                <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Izindeki Personeller</div>
                <div className="mt-2 text-3xl font-black text-amber-500">{activeStats.on_leave.length}</div>
                <div className="mt-1 text-xs text-muted-foreground">Bugun izinli olanlar</div>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <Calendar className="h-8 w-8" />
              </div>
            </div>
          </div>

          <div className="glass-panel flex flex-col gap-4 rounded-3xl p-6 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void loadStaff()}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-indigo-500"
                placeholder="Personel ara..."
              />
            </div>
            <select
              value={staffRole}
              onChange={(e) => setStaffRole(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
            >
              <option value="">Tum Roller</option>
              <option value="coordinator">Koordinator</option>
              <option value="staff">Personel</option>
              {roleOptions
                .filter((role) => !["coordinator", "staff"].includes(role))
                .map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
            </select>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="min-w-[180px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
              disabled={projectsLoading}
            >
              <option value="">Tum Projeler</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={String(project.id)}>
                  {project.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => void loadStaff()}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700"
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
                    <th className="px-6 py-4">Personel</th>
                    <th className="px-6 py-4">Iletisim</th>
                    <th className="px-6 py-4">Birim / Unvan</th>
                    <th className="px-6 py-4">Projeler</th>
                    <th className="px-6 py-4">Sozlesme</th>
                    <th className="px-6 py-4 text-right">Islem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {staffLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-400" />
                      </td>
                    </tr>
                  ) : staff.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        Personel bulunamadi.
                      </td>
                    </tr>
                  ) : (
                    staff.map((staffItem) => (
                      <tr key={staffItem.id} className="transition-colors hover:bg-white/5">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">
                            {staffItem.name} {staffItem.surname}
                          </div>
                          <div className="text-[10px] font-bold uppercase text-indigo-400">{staffItem.role}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-900">{staffItem.email}</div>
                          <div className="text-xs">{staffItem.phone || "-"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{staffItem.staff_profile?.unit || "-"}</div>
                          <div className="text-xs">{staffItem.staff_profile?.title || "-"}</div>
                        </td>
                        <td className="px-6 py-4">
                          {!staffItem.projects?.length ? (
                            <span className="text-xs text-muted-foreground">Atama yok</span>
                          ) : (
                            <div className="flex max-w-xs flex-wrap gap-1.5">
                              {staffItem.projects.slice(0, 3).map((project) => (
                                <span
                                  key={`${project.assignment_type}-${project.id}`}
                                  className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-[10px] font-bold text-indigo-500"
                                  title={project.assignment_type === "coordinator" ? "Koordinator" : "Gorevli"}
                                >
                                  {project.name}
                                </span>
                              ))}
                              {staffItem.projects.length > 3 ? (
                                <span className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-bold text-muted-foreground">
                                  +{staffItem.projects.length - 3}
                                </span>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">{staffItem.staff_profile?.contract_type || "-"}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => void openStaffModal(staffItem.id)}
                            className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-xs font-bold text-slate-900 transition-colors hover:bg-white/10"
                          >
                            <UserCog className="h-4 w-4" />
                            Ozluk Dosyasi
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "leaves" && (
        <div className="space-y-6">
          <div className="glass-panel flex flex-col gap-4 rounded-3xl p-6 md:flex-row">
            <select
              value={leaveStatus}
              onChange={(e) => setLeaveStatus(e.target.value)}
              className="min-w-[200px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
            >
              <option value="">Tum Durumlar</option>
              <option value="pending">Bekleyenler</option>
              <option value="approved">Onaylananlar</option>
              <option value="rejected">Reddedilenler</option>
            </select>
            <button
              onClick={() => void loadLeaves()}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700"
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
                    <th className="px-6 py-4">Personel</th>
                    <th className="px-6 py-4">Tarih Araligi</th>
                    <th className="px-6 py-4">Sebep</th>
                    <th className="px-6 py-4">Durum</th>
                    <th className="px-6 py-4 text-right">Islemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leavesLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-400" />
                      </td>
                    </tr>
                  ) : leaves.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        Izin talebi bulunamadi.
                      </td>
                    </tr>
                  ) : (
                    leaves.map((leave) => (
                      <tr key={leave.id} className="transition-colors hover:bg-white/5">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">
                            {leave.user?.name} {leave.user?.surname}
                          </div>
                          <div className="text-[10px] font-bold uppercase text-indigo-400">{leave.user?.role}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">
                            {new Date(leave.start_date).toLocaleDateString("tr-TR")} -{" "}
                            {new Date(leave.end_date).toLocaleDateString("tr-TR")}
                          </div>
                        </td>
                        <td className="max-w-xs truncate px-6 py-4" title={leave.reason || ""}>
                          {leave.reason || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                              leave.status === "pending"
                                ? "bg-amber-500/10 text-amber-500"
                                : leave.status === "approved"
                                  ? "bg-green-500/10 text-green-500"
                                  : "bg-red-500/10 text-red-500"
                            }`}
                          >
                            {leave.status === "pending"
                              ? "Bekliyor"
                              : leave.status === "approved"
                                ? "Onaylandi"
                                : "Reddedildi"}
                          </span>
                          {leave.approver && (
                            <div className="mt-1 text-[10px]">Islem: {leave.approver.name}</div>
                          )}
                        </td>
                        <td className="space-x-2 px-6 py-4 text-right">
                          {leave.status === "pending" && (
                            <>
                              <PermissionGate permission="staff.leave.approve">
                                <button
                                  type="button"
                                  onClick={() => void handleLeaveAction(leave.id, "approve")}
                                  className="inline-flex items-center justify-center rounded-lg bg-white/5 p-2 text-green-500 transition-colors hover:bg-green-500 hover:text-white"
                                  title="Onayla"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              </PermissionGate>
                              <PermissionGate permission="staff.leave.reject">
                                <button
                                  type="button"
                                  onClick={() => void handleLeaveAction(leave.id, "reject")}
                                  className="inline-flex items-center justify-center rounded-lg bg-white/5 p-2 text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                                  title="Reddet"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </PermissionGate>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {createOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                Yeni calisan olustur
              </h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={(e) => void handleCreateStaff(e)} className="space-y-4 overflow-y-auto p-6">
              {createError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{createError}</div>
              ) : null}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-950">
                Calisana sifre belirleme baglantisi e-posta ile gider. Proje atamalari rol kapsaminda panel gorunurlugunu belirler.
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Ad</label>
                  <input
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Soyad</label>
                  <input
                    required
                    value={createForm.surname}
                    onChange={(e) => setCreateForm((p) => ({ ...p, surname: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">E-posta</label>
                  <input
                    required
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Telefon</label>
                  <input
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Rol</label>
                  {createRolesLoading ? (
                    <div className="mt-2 flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                    </div>
                  ) : (
                    <select
                      required
                      value={createForm.role}
                      onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
                    >
                      {createRoles.length === 0 ? (
                        <option value="">Rol yok</option>
                      ) : (
                        createRoles.map((role) => (
                          <option key={role.name} value={role.name}>
                            {role.label}
                          </option>
                        ))
                      )}
                    </select>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Birim</label>
                  <input
                    value={createForm.unit}
                    onChange={(e) => setCreateForm((p) => ({ ...p, unit: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Projeler</div>
                <div className="max-h-44 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {projectOptions.length === 0 ? (
                    <div className="text-sm text-slate-500">Proje listesi yuklenemedi veya proje yok.</div>
                  ) : (
                    projectOptions.map((project) => (
                      <label key={project.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-white">
                        <input
                          type="checkbox"
                          checked={createProjectIds.includes(project.id)}
                          onChange={() => toggleCreateProject(project.id)}
                          className="h-4 w-4 rounded border-slate-400 text-indigo-600"
                        />
                        <span className="font-medium text-slate-900">{project.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Kapat
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting || createRolesLoading || createRoles.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Olustur
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 bg-white/5 p-6">
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
                <UserCog className="h-5 w-5 text-indigo-400" />
                Ozluk Dosyasi ve Detaylar
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/10 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              {modalLoading || !selectedStaff ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Ad Soyad</div>
                      <div className="text-lg font-bold text-slate-900">
                        {selectedStaff.name} {selectedStaff.surname}
                      </div>
                      <div className="text-sm uppercase tracking-widest text-indigo-400">{selectedStaff.role}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Iletisim</div>
                      <div className="text-sm font-bold text-slate-900">{selectedStaff.email}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedStaff.phone || "Telefon kayitli degil"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Birim ve Unvan</div>
                      <div className="text-sm font-bold text-slate-900">
                        {selectedStaff.staff_profile?.unit || "Birim girilmemis"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedStaff.staff_profile?.title || "Unvan girilmemis"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">
                        Sozlesme ve Baslangic
                      </div>
                      <div className="text-sm font-bold text-slate-900">{selectedStaff.staff_profile?.contract_type || "-"}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedStaff.staff_profile?.start_date
                          ? new Date(selectedStaff.staff_profile.start_date).toLocaleDateString("tr-TR")
                          : "-"}
                      </div>
                    </div>
                  </div>

                  <hr className="border-white/5" />

                  <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-indigo-400">
                        <FolderKanban className="h-4 w-4" />
                        Proje Atamalari
                      </h3>
                      {canManageProjectAssignments ? (
                        <button
                          type="button"
                          onClick={() => void handleSaveProjects()}
                          disabled={savingProjects || projectsLoading}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {savingProjects ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          Projeleri Kaydet
                        </button>
                      ) : null}
                    </div>

                    {projectsLoading ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
                      </div>
                    ) : projectOptions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
                        Proje listesi yuklenemedi veya erisilebilir proje bulunamadi.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {selectedStaff.role === "coordinator" ? (
                          <div>
                            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-900">
                              Koordine ettigi projeler
                            </div>
                            <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-3">
                              {projectOptions.map((project) => (
                                <label
                                  key={`coordinated-${project.id}`}
                                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-white/10"
                                >
                                  <input
                                    type="checkbox"
                                    checked={coordinatedProjectIds.includes(project.id)}
                                    onChange={() => toggleProjectId("coordinator", project.id)}
                                    disabled={!canManageProjectAssignments}
                                    className="h-4 w-4 rounded border-slate-400 text-indigo-600"
                                  />
                                  <span className="font-medium text-slate-900">{project.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {selectedStaff.role !== "coordinator" ? (
                          <div>
                            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-900">
                              Gorevli oldugu projeler
                            </div>
                            <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-3">
                              {projectOptions.map((project) => (
                                <label
                                  key={`assigned-${project.id}`}
                                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-white/10"
                                >
                                  <input
                                    type="checkbox"
                                    checked={assignedProjectIds.includes(project.id)}
                                    onChange={() => toggleProjectId("staff", project.id)}
                                    disabled={!canManageProjectAssignments}
                                    className="h-4 w-4 rounded border-slate-400 text-indigo-600"
                                  />
                                  <span className="font-medium text-slate-900">{project.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="mb-4 flex items-center justify-between text-sm font-bold uppercase tracking-widest text-slate-900">
                      Ozluk Belgeleri
                      <PermissionGate
                        permission="staff.documents.upload"
                        requireUnitAccess={{
                          permission: "staff.documents.upload",
                          unit: selectedStaff.staff_profile?.unit,
                        }}
                      >
                        <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600/20 px-4 py-2 text-xs font-bold text-indigo-400 transition-colors hover:bg-indigo-600 hover:text-white">
                          {uploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          Yeni Belge Yukle
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={handleDocumentUpload}
                            disabled={uploadingDoc}
                          />
                        </label>
                      </PermissionGate>
                    </h3>

                    {!selectedStaff.staff_profile?.personal_documents?.length ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-muted-foreground">
                        Henuz belge yuklenmemis.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {selectedStaff.staff_profile.personal_documents.map((document, index) => (
                          <div
                            key={`${document.path}-${index}`}
                            className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                              <div className="truncate">
                                <div className="truncate text-xs font-bold text-slate-900">{document.label}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {new Date(document.uploaded_at).toLocaleDateString("tr-TR")}
                                </div>
                              </div>
                            </div>
                            <a
                              href={document.url ?? `${process.env.NEXT_PUBLIC_STORAGE_URL || "http://localhost:8000/storage"}/${document.path.replace(/^public\//, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-white/5 p-2 text-muted-foreground hover:bg-white/10 hover:text-slate-900"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
