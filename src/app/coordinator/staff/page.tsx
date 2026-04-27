"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle, Filter, Loader2, Search, Users, XCircle } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { useAuth } from "@/store/useAuth";

interface StaffProfile {
  title: string | null;
  unit: string | null;
  contract_type: string | null;
  start_date: string | null;
}

interface StaffUser {
  id: number;
  name: string;
  surname: string;
  email: string;
  phone: string | null;
  role: string;
  staff_profile: StaffProfile | null;
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

interface ActiveStats {
  active_staff: Array<{ id: number; name: string; surname: string; role: string }>;
  on_leave: Array<{ id: number; name: string; surname: string; role: string }>;
}

const leaveStatusLabels: Record<LeaveRequest["status"], string> = {
  pending: "Bekliyor",
  approved: "Onaylandi",
  rejected: "Reddedildi",
};

const leaveStatusClasses: Record<LeaveRequest["status"], string> = {
  pending: "bg-amber-500/10 text-amber-500",
  approved: "bg-green-500/10 text-green-500",
  rejected: "bg-red-500/10 text-red-500",
};

const roleLabels: Record<string, string> = {
  coordinator: "Koordinator",
  staff: "Personel",
};

export default function CoordinatorStaffPage() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<"staff" | "leaves">("staff");
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [activeStats, setActiveStats] = useState<ActiveStats>({ active_staff: [], on_leave: [] });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const canViewStaff = hasPermission("staff.view");
  const canExportStaff = hasPermission("staff.export");
  const canApproveLeave = hasPermission("staff.leave.approve");
  const canRejectLeave = hasPermission("staff.leave.reject");
  const canManageLeaves = canApproveLeave || canRejectLeave;

  const loadStaff = useCallback(async () => {
    try {
      const response = await api.get("/admin/staff", {
        params: {
          search: search || undefined,
          role: roleFilter || undefined,
        },
      });
      setStaffList(response.data?.staff?.data || []);
    } catch (error) {
      console.error("Koordinator personel listesi yuklenemedi", error);
      setErrorMessage("Personel listesi yuklenemedi.");
    }
  }, [roleFilter, search]);

  const loadLeaves = useCallback(async () => {
    try {
      const response = await api.get("/admin/leave-requests", {
        params: {
          status: leaveStatusFilter || undefined,
        },
      });
      setLeaves(response.data?.leave_requests?.data || []);
    } catch (error) {
      console.error("Koordinator izin talepleri yuklenemedi", error);
      setErrorMessage("Izin talepleri yuklenemedi.");
    }
  }, [leaveStatusFilter]);

  const loadActiveStats = useCallback(async () => {
    try {
      const response = await api.get<ActiveStats>("/admin/staff/active");
      setActiveStats(response.data);
    } catch (error) {
      console.error("Koordinator aktif personel verileri yuklenemedi", error);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const init = async () => {
        setLoading(true);
        setErrorMessage("");
        try {
          await Promise.all([loadStaff(), loadLeaves(), loadActiveStats()]);
        } finally {
          setLoading(false);
        }
      };

      void init();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadActiveStats, loadLeaves, loadStaff]);

  const filteredStaff = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");
    return staffList.filter((staff) => {
      const matchesSearch =
        !normalizedSearch ||
        `${staff.name} ${staff.surname}`.toLocaleLowerCase("tr-TR").includes(normalizedSearch) ||
        staff.email.toLocaleLowerCase("tr-TR").includes(normalizedSearch);
      const matchesRole = !roleFilter || staff.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [roleFilter, search, staffList]);

  const handleLeaveAction = async (id: number, action: "approve" | "reject") => {
    if (!confirm(`Talebi ${action === "approve" ? "onaylamak" : "reddetmek"} istiyor musunuz?`)) {
      return;
    }

    setActionLoading(id);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await api.put(`/admin/leave-requests/${id}/${action}`);
      setSuccessMessage(action === "approve" ? "Izin talebi onaylandi." : "Izin talebi reddedildi.");
      await Promise.all([loadLeaves(), loadActiveStats()]);
    } catch (error) {
      console.error("Izin talebi guncellenemedi", error);
      setErrorMessage("Izin talebi guncellenemedi.");
    } finally {
      setActionLoading(null);
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
    <PermissionGate
      permission="staff.view"
      fallback={
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-6 py-8 text-center text-sm text-amber-100">
          Personel ekranina erisim yetkiniz bulunmuyor.
        </div>
      }
    >
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Birim Personeli</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Personel listesi, aktiflik ve izin surecleri
            </p>
          </div>
        </div>
        <a
          href="http://kademepuantaj.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700"
        >
          <CalendarDays className="h-5 w-5" />
          Aylik Puantaj Sistemi
        </a>
        {canExportStaff && (
          <ExportButtons
            endpoint={activeTab === "staff" ? "/admin/staff/export" : "/admin/leave-requests/export"}
            filename={activeTab === "staff" ? "koordinator_personel" : "koordinator_izinler"}
            params={activeTab === "staff" ? { role: roleFilter || undefined, search: search || undefined } : { status: leaveStatusFilter || undefined }}
            buttonLabel={activeTab === "staff" ? "Personeli Disa Aktar" : "Izinleri Disa Aktar"}
          />
        )}
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="glass-panel flex items-center justify-between rounded-3xl p-6">
          <div>
            <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Aktif Calisanlar</div>
            <div className="mt-2 text-3xl font-black text-emerald-400">{activeStats.active_staff.length}</div>
            <div className="mt-1 text-xs text-muted-foreground">Son 8 saatte aktif olanlar</div>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
            <Users className="h-8 w-8" />
          </div>
        </div>

        <div className="glass-panel flex items-center justify-between rounded-3xl p-6">
          <div>
            <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Izindeki Personeller</div>
            <div className="mt-2 text-3xl font-black text-amber-500">{activeStats.on_leave.length}</div>
            <div className="mt-1 text-xs text-muted-foreground">Bugun izinli olanlar</div>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <CalendarDays className="h-8 w-8" />
          </div>
        </div>
      </div>

      {(canViewStaff || canManageLeaves) && (
        <div className="flex space-x-1 rounded-2xl bg-black/40 p-1 md:w-max">
          {canViewStaff && (
            <button
              onClick={() => setActiveTab("staff")}
              className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                activeTab === "staff"
                  ? "bg-accent text-accent-foreground shadow-lg"
                  : "text-muted-foreground hover:bg-white/5 hover:text-slate-900"
              }`}
            >
              <Users className="h-4 w-4" />
              Calisan Listesi
            </button>
          )}
          {canManageLeaves && (
            <button
              onClick={() => setActiveTab("leaves")}
              className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                activeTab === "leaves"
                  ? "bg-accent text-accent-foreground shadow-lg"
                  : "text-muted-foreground hover:bg-white/5 hover:text-slate-900"
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              Izin Talepleri
            </button>
          )}
        </div>
      )}

      {!canViewStaff && !canManageLeaves ? (
        <div className="glass-panel rounded-3xl p-10 text-center text-sm text-muted-foreground">
          Bu modulu goruntulemek icin yetkiniz bulunmuyor.
        </div>
      ) : activeTab === "staff" && canViewStaff ? (
        <div className="space-y-6">
          <div className="glass-panel flex flex-col gap-4 rounded-3xl p-6 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-accent"
                placeholder="Isim veya e-posta ara..."
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-accent min-w-[180px]"
            >
              <option value="">Tum Roller</option>
              {Object.entries(roleLabels).map(([role, label]) => (
                <option key={role} value={role}>
                  {label}
                </option>
              ))}
            </select>
            <button
              onClick={() => void loadStaff()}
              className="flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-accent-foreground shadow-lg shadow-accent/20 hover:opacity-90"
            >
              <Filter className="h-4 w-4" />
              Filtrele
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredStaff.map((staff) => (
              <div key={staff.id} className="glass-panel rounded-3xl p-6 transition-colors hover:bg-white/5">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/20 text-xl font-black text-accent">
                    {staff.name.charAt(0)}
                    {staff.surname.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900">
                      {staff.name} {staff.surname}
                    </h3>
                    <div className="text-xs text-muted-foreground">{staff.staff_profile?.title || "Personel"}</div>
                    <div className="mt-2 text-[10px] font-bold uppercase text-accent">
                      {roleLabels[staff.role] || staff.role}
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-2 border-t border-white/5 pt-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Birim</span>
                    <span className="font-bold text-slate-900">{staff.staff_profile?.unit || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">E-posta</span>
                    <span className="font-bold text-slate-900">{staff.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telefon</span>
                    <span className="font-bold text-slate-900">{staff.phone || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Baslangic</span>
                    <span className="font-bold text-slate-900">
                      {staff.staff_profile?.start_date
                        ? new Date(staff.staff_profile.start_date).toLocaleDateString("tr-TR")
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {filteredStaff.length === 0 && (
              <div className="glass-panel col-span-full rounded-3xl py-12 text-center text-muted-foreground">
                Personel kaydi bulunamadi.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "leaves" && canManageLeaves && (
        <div className="space-y-6">
          <div className="glass-panel flex flex-col gap-4 rounded-3xl p-6 md:flex-row">
            <select
              value={leaveStatusFilter}
              onChange={(e) => setLeaveStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-accent min-w-[180px]"
            >
              <option value="">Tum Durumlar</option>
              <option value="pending">Bekleyenler</option>
              <option value="approved">Onaylananlar</option>
              <option value="rejected">Reddedilenler</option>
            </select>
            <button
              onClick={() => void loadLeaves()}
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
                    <th className="px-6 py-4">Personel</th>
                    <th className="px-6 py-4">Baslangic</th>
                    <th className="px-6 py-4">Bitis</th>
                    <th className="px-6 py-4">Gerekce</th>
                    <th className="px-6 py-4">Durum</th>
                    <th className="px-6 py-4 text-right">Islem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leaves.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        Izin talebi bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    leaves.map((leave) => (
                      <tr key={leave.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {leave.user?.name} {leave.user?.surname}
                          <div className="text-[10px] font-normal text-muted-foreground">
                            {leave.user?.email || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4">{new Date(leave.start_date).toLocaleDateString("tr-TR")}</td>
                        <td className="px-6 py-4">{new Date(leave.end_date).toLocaleDateString("tr-TR")}</td>
                        <td className="max-w-[220px] truncate px-6 py-4" title={leave.reason || ""}>
                          {leave.reason || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${leaveStatusClasses[leave.status]}`}
                          >
                            {leaveStatusLabels[leave.status]}
                          </span>
                          {leave.approver && (
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              Islem: {leave.approver.name} {leave.approver.surname}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {leave.status === "pending" && (
                            <div className="flex justify-end gap-2">
                              {canApproveLeave && (
                                <button
                                  onClick={() => void handleLeaveAction(leave.id, "approve")}
                                  disabled={actionLoading === leave.id}
                                  className="rounded-lg bg-green-500/20 p-2 text-green-500 transition-colors hover:bg-green-500 hover:text-white disabled:opacity-50"
                                  title="Onayla"
                                >
                                  {actionLoading === leave.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                              {canRejectLeave && (
                                <button
                                  onClick={() => void handleLeaveAction(leave.id, "reject")}
                                  disabled={actionLoading === leave.id}
                                  className="rounded-lg bg-red-500/20 p-2 text-red-500 transition-colors hover:bg-red-500 hover:text-white disabled:opacity-50"
                                  title="Reddet"
                                >
                                  {actionLoading === leave.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <XCircle className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </div>
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
    </div>
    </PermissionGate>
  );
}
