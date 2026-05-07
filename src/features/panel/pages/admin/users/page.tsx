"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Award,
  CheckCircle,
  Eye,
  Filter,
  GraduationCap,
  Loader2,
  Search,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

interface User {
  id: number;
  name: string;
  surname: string;
  email: string;
  phone: string | null;
  role: string;
  status: "active" | "passive" | "blacklisted" | "alumni";
  created_at: string;
}

interface CertificateItem {
  id: number;
  created_at?: string;
  issued_at?: string;
  project?: { name: string } | null;
}

interface UserDetail extends User {
  university: string | null;
  department: string | null;
  class_year: string | null;
  hometown: string | null;
  birth_date: string | null;
  blacklist_count: number;
  credit_score?: number;
  absent_count?: number;
  certificates?: CertificateItem[];
  documents?: Array<{ path: string; label: string; uploaded_at: string }>;
  coordinated_projects?: Array<{ id: number; name: string }>;
}

const roleLabels: Record<string, string> = {
  student: "Ogrenci",
  alumni: "Mezun",
};

interface RoleOption {
  name: string;
  label: string;
}

export default function AdminUsersPage() {
  const { hasPermission, hasGlobalScope } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createRoles, setCreateRoles] = useState<RoleOption[]>([]);
  const [createRolesLoading, setCreateRolesLoading] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    surname: "",
    email: "",
    phone: "",
    role: "",
  });
  const [createError, setCreateError] = useState("");

  const roleOptionsForForm = createRoles;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await api.get("/panel/users", {
        params: { page, search, role: roleFilter, status: statusFilter },
      });
      setUsers(res.data?.users?.data || []);
      setTotalPages(res.data?.users?.last_page || 1);
    } catch (error) {
      console.error("Kullanicilar yuklenemedi", error);
      setErrorMessage("Kullanici listesi yuklenirken bir hata olustu.");
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search, statusFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadUsers]);

  const handleUpdateStatus = async (id: number, currentStatus: User["status"]) => {
    if (!confirm(`Kullaniciyi ${currentStatus === "active" ? "pasif" : "aktif"} yapmak istiyor musunuz?`)) {
      return;
    }

    setActionLoading(id);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const newStatus: User["status"] = currentStatus === "active" ? "passive" : "active";
      await api.put(`/panel/users/${id}`, { status: newStatus });
      setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, status: newStatus } : user)));
      setSuccessMessage("Kullanici durumu guncellendi.");
      if (selectedUser?.id === id) {
        setSelectedUser({ ...selectedUser, status: newStatus });
      }
    } catch (error) {
      console.error("Durum guncellenemedi", error);
      setErrorMessage("Kullanici durumu guncellenemedi.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRole = async (id: number, newRole: string) => {
    if (!confirm(`Kullanici rolunu ${roleLabels[newRole] || newRole} olarak guncellemek istiyor musunuz?`)) {
      return;
    }

    setActionLoading(id);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await api.put(`/panel/users/${id}`, { role: newRole });
      setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, role: newRole } : user)));
      setSuccessMessage("Kullanici rolu guncellendi.");
      if (selectedUser?.id === id) {
        setSelectedUser({ ...selectedUser, role: newRole });
      }
    } catch (error) {
      console.error("Rol guncellenemedi", error);
      setErrorMessage("Kullanici rolu guncellenemedi.");
    } finally {
      setActionLoading(null);
    }
  };

  const openUserModal = async (id: number) => {
    setIsModalOpen(true);
    setModalLoading(true);
    setErrorMessage("");
    try {
      const res = await api.get(`/panel/users/${id}`);
      setSelectedUser({
        ...res.data.user,
        documents: res.data.documents || [],
        credit_score: res.data.credit_score || 0,
        absent_count: res.data.absent_count || 0,
      });
    } catch (error) {
      console.error("Kullanici detaylari yuklenemedi", error);
      setErrorMessage("Kullanici detaylari yuklenemedi.");
      setSelectedUser(null);
    } finally {
      setModalLoading(false);
    }
  };

  const applyFilters = () => {
    setPage(1);
    void loadUsers();
  };

  const openCreateModal = () => {
    setCreateOpen(true);
    setCreateError("");
    setCreateForm({ name: "", surname: "", email: "", phone: "", role: "" });
    setCreateRolesLoading(true);
    void api
      .get<{ roles: RoleOption[] }>("/panel/users/create-options")
      .then((res) => {
        const roles = res.data?.roles ?? [];
        setCreateRoles(roles);
        setCreateForm((prev) => ({
          ...prev,
          role: roles[0]?.name ?? "",
        }));
      })
      .catch(() => {
        setCreateError("Rol listesi yuklenemedi. Yetkinizi kontrol edin.");
        setCreateRoles([]);
      })
      .finally(() => setCreateRolesLoading(false));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!createForm.name.trim() || !createForm.surname.trim() || !createForm.email.trim() || !createForm.role) {
      setCreateError("Ad, soyad, e-posta ve rol zorunludur.");
      return;
    }
    setCreateSubmitting(true);
    try {
      const payload: Record<string, string> = {
        name: createForm.name.trim(),
        surname: createForm.surname.trim(),
        email: createForm.email.trim(),
        role: createForm.role,
      };
      if (createForm.phone.trim()) {
        payload.phone = createForm.phone.trim();
      }
      const res = await api.post<{ message?: string }>("/panel/users", payload);
      setSuccessMessage(res.data?.message ?? "Kullanici olusturuldu.");
      void loadUsers();
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
        const fromMessage = data?.message;
        const fromErrors = data?.errors
          ? Object.values(data.errors)
              .flat()
              .filter(Boolean)
              .join(" ")
          : "";
        const msg = fromMessage || fromErrors;
        setCreateError(msg ? String(msg) : "Kayit basarisiz.");
      } else {
        setCreateError("Kayit basarisiz.");
      }
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Ogrenci ve Mezun Yonetimi</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Ogrenci ve mezun hesaplari
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {hasPermission("users.create") && hasGlobalScope("users.create") ? (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-indigo-600 transition-colors hover:bg-indigo-600 hover:text-white"
            >
              <UserPlus className="h-4 w-4" />
              Yeni Ogrenci / Mezun
            </button>
          ) : null}
          <PermissionGate permission="users.export">
            <ExportButtons
              endpoint="/panel/users/export"
              filename="kullanici_listesi"
              params={{
                role: roleFilter || undefined,
                status: statusFilter || undefined,
                search: search || undefined,
              }}
              buttonLabel="Listeyi Disa Aktar"
            />
          </PermissionGate>
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

      <div className="glass-panel flex flex-col gap-4 rounded-3xl p-6 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-indigo-500"
            placeholder="Ogrenci veya mezun ara..."
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
        >
          <option value="">Ogrenci ve Mezun</option>
          {Object.entries(roleLabels).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
        >
          <option value="">Tum Durumlar</option>
          <option value="active">Aktif</option>
          <option value="passive">Pasif</option>
          <option value="blacklisted">Kara Liste</option>
          <option value="alumni">Mezun</option>
        </select>
        <button
          onClick={applyFilters}
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
                <th className="px-6 py-4">Kullanici</th>
                <th className="px-6 py-4">Iletisim</th>
                <th className="px-6 py-4">Kayit Tarihi</th>
                <th className="px-6 py-4">Rol / Yetki</th>
                <th className="px-6 py-4">Durum</th>
                <th className="px-6 py-4 text-right">Islem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-400" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    Kullanici bulunamadi.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">
                        {user.name} {user.surname}
                      </div>
                      <div className="text-[10px] text-muted-foreground">ID: {user.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900">{user.email}</div>
                      <div className="text-[10px]">{user.phone || "-"}</div>
                    </td>
                    <td className="px-6 py-4">{new Date(user.created_at).toLocaleDateString("tr-TR")}</td>
                    <td className="px-6 py-4">
                      {hasPermission("users.assign_role") && hasGlobalScope("users.assign_role") ? (
                        <select
                          value={user.role}
                          onChange={(e) => void handleUpdateRole(user.id, e.target.value)}
                          disabled={actionLoading === user.id || user.role === "super_admin"}
                          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold uppercase text-indigo-400 outline-none focus:border-indigo-500 disabled:opacity-50"
                        >
                          {Object.entries(roleLabels).map(([key, value]) => (
                            <option key={key} value={key}>
                            {value}
                          </option>
                          ))}
                      </select>
                      ) : (
                        <span className="inline-flex rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold uppercase text-indigo-400">
                          {roleLabels[user.role] || user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                          user.status === "active"
                            ? "bg-green-500/10 text-green-500"
                            : user.status === "passive"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-amber-500/10 text-amber-500"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="space-x-2 px-6 py-4 text-right">
                      <button
                        onClick={() => void openUserModal(user.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-400 transition-colors hover:bg-indigo-500 hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                        Profil
                      </button>
                      <PermissionGate permission="users.update">
                      {user.role !== "super_admin" && (
                        <button
                          onClick={() => void handleUpdateStatus(user.id, user.status)}
                          disabled={actionLoading === user.id}
                          className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
                            user.status === "active"
                              ? "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                              : "bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white"
                          }`}
                        >
                          {actionLoading === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : user.status === "active" ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          {user.status === "active" ? "Askiya Al" : "Aktiflestir"}
                        </button>
                      )}
                      </PermissionGate>
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
              onClick={() => setPage((prev) => prev - 1)}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-900 disabled:opacity-50"
            >
              Onceki
            </button>
            <span className="text-xs font-bold text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-900 disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        )}
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                Yeni ogrenci / mezun olustur
              </h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={(e) => void handleCreateUser(e)} className="space-y-4 p-6">
              {createError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{createError}</div>
              ) : null}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-950">
                Hesaba <strong>sifre belirleme baglantisi</strong> e-posta ile gider. Baglantiyi kullanmadan ogrenci/mezun
                alanina <strong>giris yapamaz</strong>. E-posta gelmezse &quot;Sifremi unuttum&quot; ile yeni baglanti
                talep edebilir.
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
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Telefon (istege bagli)</label>
                <input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>
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
                    {roleOptionsForForm.length === 0 ? (
                      <option value="">Rol yok</option>
                    ) : (
                      roleOptionsForForm.map((r) => (
                        <option key={r.name} value={r.name}>
                          {r.label}
                        </option>
                      ))
                    )}
                  </select>
                )}
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
                  disabled={createSubmitting || createRolesLoading || roleOptionsForForm.length === 0}
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
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 bg-white/5 p-6">
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
                <Users className="h-5 w-5 text-indigo-400" />
                Kullanici / Ogrenci Profil Bilgisi
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/10 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              {modalLoading || !selectedUser ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Ad Soyad</div>
                      <div className="text-lg font-bold text-slate-900">
                        {selectedUser.name} {selectedUser.surname}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-indigo-400">
                        {roleLabels[selectedUser.role] || selectedUser.role}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Iletisim</div>
                      <div className="text-sm font-bold text-slate-900">{selectedUser.email}</div>
                      <div className="text-sm text-muted-foreground">{selectedUser.phone || "Telefon yok"}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Kayit Tarihi</div>
                      <div className="text-sm font-bold text-slate-900">
                        {new Date(selectedUser.created_at).toLocaleDateString("tr-TR")}
                      </div>
                      <div className="text-sm text-muted-foreground">Statu: {selectedUser.status}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Memleket / Dogum</div>
                      <div className="text-sm font-bold text-slate-900">{selectedUser.hometown || "-"}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedUser.birth_date
                          ? new Date(selectedUser.birth_date).toLocaleDateString("tr-TR")
                          : "-"}
                      </div>
                    </div>
                  </div>

                  <hr className="border-white/5" />

                  <div className="rounded-2xl border border-indigo-500/10 bg-indigo-500/5 p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-indigo-400">
                      <GraduationCap className="h-4 w-4" />
                      Okul ve Mezuniyet Bilgileri
                    </h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Universite</div>
                        <div className="font-bold text-slate-900">{selectedUser.university || "Girilmemis"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Bolum</div>
                        <div className="font-bold text-slate-900">{selectedUser.department || "Girilmemis"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Sinif / Yil</div>
                        <div className="font-bold text-slate-900">{selectedUser.class_year || "Girilmemis"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Puan ve Devamsizlik</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl border border-white/5 bg-white/5 p-4 text-center">
                          <div className="text-3xl font-black text-emerald-400">{selectedUser.credit_score || 0}</div>
                          <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                            Toplam Puan
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-white/5 p-4 text-center">
                          <div className="text-3xl font-black text-amber-500">{selectedUser.absent_count || 0}</div>
                          <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                            Devamsizlik
                          </div>
                        </div>
                      </div>
                      {selectedUser.blacklist_count > 0 && (
                        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                          <AlertTriangle className="h-6 w-6 text-red-500" />
                          <div>
                            <div className="font-bold text-red-500">Kara Liste Uyarisi</div>
                            <div className="text-xs text-red-400">
                              Bu kullanici {selectedUser.blacklist_count} kez ceza / blacklist kaydi almis.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-900">
                        <Award className="h-4 w-4 text-amber-400" />
                        Sertifikalar
                      </h3>
                      {!selectedUser.certificates?.length ? (
                        <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-muted-foreground">
                          Sertifika bulunamadi.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedUser.certificates.map((certificate) => (
                            <div
                              key={certificate.id}
                              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3"
                            >
                              <div className="text-sm font-bold text-slate-900">
                                {certificate.project?.name || "Bilinmeyen Proje"} Sertifikasi
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(certificate.issued_at || certificate.created_at || "").toLocaleDateString(
                                  "tr-TR",
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
