"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Loader2, Mail, Phone, Search, Users, XCircle } from "lucide-react";
import api from "@/lib/api/axios";
import { useAuth } from "@/store/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";

interface StaffMember {
  id: number;
  name: string;
  surname: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  staff_profile?: {
    title?: string | null;
    unit?: string | null;
  } | null;
}

interface PaginatedMembers {
  data: StaffMember[];
  current_page: number;
  last_page: number;
  total: number;
}

interface LeaveRequest {
  id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  user?: { name: string; surname: string } | null;
  approver?: { name: string; surname: string } | null;
  unit?: { name: string } | null;
  can_approve: boolean;
  can_reject: boolean;
}

interface PaginatedLeaves {
  data: LeaveRequest[];
  current_page: number;
  last_page: number;
  total: number;
}

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}.${month}.${year}` : value;
}

export default function StaffMembersPage() {
  const { activeUnitId } = usePermissions();
  return <StaffMembersContent key={activeUnitId ?? "none"} />;
}

function StaffMembersContent() {
  const { user, hasPermission } = useAuth();
  const { activeUnitId, hasScopedPermission } = usePermissions();
  const canApprove = hasScopedPermission("staff.leave.approve");
  const canReject = hasScopedPermission("staff.leave.reject");
  const canReviewLeaves = hasScopedPermission("staff.view") && (canApprove || canReject);
  const [activeTab, setActiveTab] = useState<"members" | "leaves">("members");
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [membersPage, setMembersPage] = useState(1);
  const [membersLastPage, setMembersLastPage] = useState(1);
  const [leaves, setLeaves] = useState<PaginatedLeaves>({ data: [], current_page: 1, last_page: 1, total: 0 });
  const [leavePage, setLeavePage] = useState(1);
  const [leaveStatus, setLeaveStatus] = useState("pending");
  const [leaveRefresh, setLeaveRefresh] = useState(0);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [processingLeaveId, setProcessingLeaveId] = useState<number | null>(null);
  const [success, setSuccess] = useState("");
  const [unit, setUnit] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setMembersPage(1);
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!hasPermission("staff.view")) {
      return;
    }

    if (activeTab !== "members") return;
    const controller = new AbortController();
    const loadMembers = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get<{ members: PaginatedMembers | []; unit?: string | null; message?: string }>("/panel/members", {
          params: { search: debouncedSearch || undefined, page: membersPage }, signal: controller.signal,
        });
        const page = Array.isArray(response.data.members) ? null : response.data.members;
        setMembers(page?.data ?? []);
        setMembersLastPage(page?.last_page ?? 1);
        setUnit(response.data.unit ?? "");
        if (response.data.message) {
          setError(response.data.message);
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          console.error("Birim üye listesi yüklenemedi", requestError);
          setError("Birim üye listesi şu anda yüklenemedi.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadMembers();
    return () => controller.abort();
  }, [activeTab, activeUnitId, debouncedSearch, hasPermission, membersPage]);

  useEffect(() => {
    if (!canReviewLeaves || activeTab !== "leaves") return;
    const controller = new AbortController();
    const loadLeaves = async () => {
      setLeavesLoading(true);
      setError("");
      try {
        const response = await api.get<{ leave_requests: PaginatedLeaves }>("/panel/leave-requests", {
          params: { status: leaveStatus || undefined, page: leavePage }, signal: controller.signal,
        });
        const page = response.data.leave_requests;
        if (page.data.length === 0 && leavePage > 1 && page.total > 0) {
          setLeavePage(Math.min(leavePage - 1, page.last_page));
        } else {
          setLeaves(page);
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          console.error("İzin talepleri yüklenemedi", requestError);
          setError("İzin talepleri şu anda yüklenemedi.");
        }
      } finally {
        if (!controller.signal.aborted) setLeavesLoading(false);
      }
    };
    void loadLeaves();
    return () => controller.abort();
  }, [activeTab, activeUnitId, canReviewLeaves, leavePage, leaveRefresh, leaveStatus]);

  const reviewLeave = async (id: number, action: "approve" | "reject") => {
    if (processingLeaveId !== null) return;
    setProcessingLeaveId(id);
    setError("");
    setSuccess("");
    try {
      await api.put(`/panel/leave-requests/${id}/${action}`);
      setSuccess(action === "approve" ? "İzin talebi onaylandı." : "İzin talebi reddedildi.");
      setLeaveRefresh((current) => current + 1);
    } catch (requestError) {
      console.error("İzin işlemi tamamlanamadı", requestError);
      setError("İzin işlemi tamamlanamadı. Yetki ve talep durumunu kontrol edin.");
    } finally {
      setProcessingLeaveId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Birim üyeleri</h1>
            <p className="mt-1 text-sm text-muted-foreground">{unit || "Seçili birim"} · {user?.name} {user?.surname}</p>
          </div>
        </div>
        <PermissionGate permission="staff.export">
          {activeTab === "members" ? (
            <ExportButtons endpoint="/panel/members/export" filename="birim_uyeleri" params={{ search: debouncedSearch || undefined }} buttonLabel="Üyeleri dışa aktar" />
          ) : (
            <ExportButtons endpoint="/panel/leave-requests/export" filename="izin_talepleri" params={{ status: leaveStatus || undefined }} buttonLabel="İzinleri dışa aktar" />
          )}
        </PermissionGate>
      </div>

      <PermissionGate
        permission="staff.view"
        fallback={
        <div className="panel-empty-card">
          Bu modülü görüntüleme yetkiniz bulunmuyor.
        </div>
        }
      >
      <div className="space-y-6">
        {canReviewLeaves ? (
          <div className="panel-tabs md:w-max">
            <button type="button" onClick={() => { setActiveTab("members"); setError(""); }} className={`panel-tab ${activeTab === "members" ? "panel-tab-active" : ""}`}>Ekip listesi</button>
            <button type="button" onClick={() => { setActiveTab("leaves"); setError(""); }} className={`panel-tab ${activeTab === "leaves" ? "panel-tab-active" : ""}`}>İzin talepleri</button>
          </div>
        ) : null}
        {error ? <div role="alert" className="panel-notice panel-notice-error">{error}</div> : null}
        {success ? <div role="status" className="panel-notice panel-notice-success">{success}</div> : null}
        {activeTab === "members" ? (
        <div className="panel-section-card">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ekip listesi</h2>
              <p className="text-sm text-muted-foreground">Özlük belgeleri bu listede gösterilmez.</p>
            </div>
            <label className="relative block md:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ad, e-posta veya unvan ara"
                aria-label="Ekip listesinde ara"
                className="panel-control pl-10"
              />
            </label>
          </div>

          {loading ? (
            <div className="flex min-h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : members.length === 0 ? (
            <div className="panel-empty-card">Bu filtreye uygun ekip üyesi bulunmuyor.</div>
          ) : (
            <div className="space-y-3 text-sm text-muted-foreground">
              {members.map((member) => (
                <div key={member.id} className="panel-card-muted">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {member.name} {member.surname}
                        </h3>
                        <span className="panel-chip">
                          {member.role}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{member.staff_profile?.title || "Unvan tanımlı değil"}</p>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground md:text-right">
                      <div className="flex items-center gap-2 md:justify-end">
                        <Mail className="h-3.5 w-3.5 text-amber-500" />
                        <span>{member.email || "E-posta yok"}</span>
                      </div>
                      <div className="flex items-center gap-2 md:justify-end">
                        <Phone className="h-3.5 w-3.5 text-amber-500" />
                        <span>{member.phone || "Telefon yok"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {membersLastPage > 1 ? (
            <div className="mt-5 flex items-center justify-end gap-3 text-sm text-muted-foreground">
              <button type="button" disabled={membersPage <= 1} onClick={() => setMembersPage((page) => page - 1)} className="panel-button">Önceki</button>
              <span>{membersPage} / {membersLastPage}</span>
              <button type="button" disabled={membersPage >= membersLastPage} onClick={() => setMembersPage((page) => page + 1)} className="panel-button">Sonraki</button>
            </div>
          ) : null}
        </div>
        ) : canReviewLeaves ? (
          <div className="panel-section-card space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">İzin talepleri</h2>
                <p className="text-sm text-muted-foreground">Seçili birimin görünür talepleri · {leaves.total} kayıt</p>
              </div>
              <select value={leaveStatus} onChange={(event) => { setLeaveStatus(event.target.value); setLeavePage(1); }} aria-label="İzin durumu" className="panel-control sm:w-48">
                <option value="pending">Bekleyenler</option>
                <option value="approved">Onaylananlar</option>
                <option value="rejected">Reddedilenler</option>
                <option value="">Tüm durumlar</option>
              </select>
            </div>
            {leavesLoading ? (
              <div className="flex min-h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>
            ) : leaves.data.length === 0 ? (
              <div className="panel-empty-card">Bu durumda izin talebi bulunmuyor.</div>
            ) : (
              <div className="space-y-3">
                {leaves.data.map((leave) => (
                  <div key={leave.id} className="panel-card-muted flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900">{leave.user?.name} {leave.user?.surname}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${leave.status === "approved" ? "bg-green-100 text-green-700" : leave.status === "rejected" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                          {leave.status === "approved" ? "Onaylandı" : leave.status === "rejected" ? "Reddedildi" : "Bekliyor"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{formatDate(leave.start_date)} – {formatDate(leave.end_date)}{leave.unit?.name ? ` · ${leave.unit.name}` : ""}</p>
                      {leave.reason ? <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{leave.reason}</p> : null}
                      {leave.approver ? <p className="text-xs text-muted-foreground">İşlem yapan: {leave.approver.name} {leave.approver.surname}</p> : null}
                    </div>
                    {leave.status === "pending" && ((leave.can_approve && canApprove) || (leave.can_reject && canReject)) ? (
                      <div className="flex shrink-0 gap-2">
                        {leave.can_approve && canApprove ? <button type="button" disabled={processingLeaveId !== null} onClick={() => void reviewLeave(leave.id, "approve")} className="panel-table-action panel-table-action-success"><CheckCircle className="h-4 w-4" /> Onayla</button> : null}
                        {leave.can_reject && canReject ? <button type="button" disabled={processingLeaveId !== null} onClick={() => void reviewLeave(leave.id, "reject")} className="panel-table-action panel-table-action-danger"><XCircle className="h-4 w-4" /> Reddet</button> : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            {leaves.last_page > 1 ? (
              <div className="flex items-center justify-end gap-3 text-sm text-muted-foreground">
                <button type="button" disabled={leavePage <= 1} onClick={() => setLeavePage((page) => page - 1)} className="panel-button">Önceki</button>
                <span>{leavePage} / {leaves.last_page}</span>
                <button type="button" disabled={leavePage >= leaves.last_page} onClick={() => setLeavePage((page) => page + 1)} className="panel-button">Sonraki</button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      </PermissionGate>
    </div>
  );
}
