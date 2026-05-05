"use client";

import { useEffect, useState } from "react";
import { Users, Calendar, CreditCard, BarChart3, MessageSquare, TrendingUp, Zap, Loader2, CheckCircle2, Send } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api/axios";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/store/useAuth";

interface DashboardStats {
  students: { active: number };
  programs: { monthly_total: number; monthly_completed: number; monthly_upcoming: number };
  financials: { monthly_expense: number; expense_change_percent: number | null; pending_count: number };
  pending: { applications: number; support: number; financials: number };
  project_occupancy: Array<{ id: number; name: string; active: number; max: number; rate: number | null }>;
  sms: { total_this_month: number; by_project: Array<{ project_id: number; count: number; project: { name: string } }> };
  upcoming_programs: Array<{ id: number; title: string; start_at: string; location: string; project_id: number; project?: { name: string } }>;
  user_stats: Record<string, number>;
}

function roleBadgeLabel(role: string | undefined) {
  if (role === "super_admin") return "UST YONETICI";
  if (role === "staff") return "PERSONEL";
  if (role === "coordinator") return "KOORDINATOR";
  return role?.toUpperCase().replace(/_/g, " ") ?? "YONETICI";
}

export default function AdminDashboardPage() {
  const { hasPermission, canAccessProject } = usePermissions();
  const { user } = useAuth();
  const role = user?.role;
  const isSuperAdmin = role === "super_admin";
  const isCoordinator = role === "coordinator";
  const isStaff = role === "staff";
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [quickAnnProject, setQuickAnnProject] = useState("all");
  const [quickAnnMessage, setQuickAnnMessage] = useState("");
  const [sendingQuickAnn, setSendingQuickAnn] = useState(false);
  const [quickAnnSuccess, setQuickAnnSuccess] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await api.get<DashboardStats>("/panel/dashboard/stats");
        setStats(response.data);
      } catch (error) {
        console.error("Admin dashboard verileri cekilemedi", error);
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const handleQuickAnnouncement = async () => {
    if (!quickAnnMessage.trim()) return;
    if (!hasPermission("announcements.create")) return;
    const projectIdForAnn = quickAnnProject === "all" ? null : parseInt(quickAnnProject, 10);
    if (projectIdForAnn != null && !canAccessProject("announcements.create", projectIdForAnn)) return;

    setSendingQuickAnn(true);
    setQuickAnnSuccess(false);

    try {
      await api.post("/panel/announcements", {
        title: "Hizli Duyuru",
        content: quickAnnMessage,
        category: "Duyuru",
        project_id: quickAnnProject === "all" ? null : parseInt(quickAnnProject, 10),
        send_sms: false,
        send_email: true,
      });
      setQuickAnnMessage("");
      setQuickAnnSuccess(true);
      setTimeout(() => setQuickAnnSuccess(false), 3000);
    } catch (error) {
      console.error("Duyuru gonderilemedi", error);
    } finally {
      setSendingQuickAnn(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  const kpi = [
    {
      label: isStaff ? "Aktif Gorevli Katilim" : "Aktif Katilimci",
      value: stats.students.active.toLocaleString("tr-TR"),
      icon: Users,
    },
    {
      label: "Aktif Proje",
      value: String(stats.project_occupancy.length),
      icon: BarChart3,
    },
    {
      label: "Gelecek Faaliyet",
      value: String(stats.upcoming_programs.length),
      icon: Calendar,
    },
    {
      label: isStaff ? "Bekleyen Destek" : "Bekleyen Basvuru",
      value: String(isStaff ? stats.pending.support : stats.pending.applications),
      icon: MessageSquare,
    },
  ];

  return (
    <div className="space-y-8 text-slate-800">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Merhaba, {user?.name || "Kullanici"}{" "}
              {user?.surname ? <span className="font-bold">{user.surname}</span> : null}
            </h1>
            <span className="inline-flex items-center rounded-md border border-sky-200/80 bg-sky-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-sky-800">
              {roleBadgeLabel(user?.role)}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {isSuperAdmin
              ? "Tum sistem operasyonel ozeti asagidadir."
              : isCoordinator
                ? "Koordinator oldugunuz proje kapsamindaki operasyonel ozet asagidadir."
                : "Yetki kapsaminizdaki operasyonel ozet asagidadir."}
          </p>
        </div>
        <div className="flex gap-2">
          <PermissionGate permission="financial.export">
            <Link
              href="/panel/financials"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Raporlar
            </Link>
          </PermissionGate>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpi.map((row) => (
          <div key={row.label} className="panel-surface flex flex-col gap-3 p-5">
            <row.icon className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{row.label}</p>
            <p className="text-3xl font-extrabold text-slate-900">{row.value}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-600">Katilim ve Buyume Analitigi</h2>
          <Link href="/panel/financials" className="text-[10px] font-bold uppercase text-slate-500 hover:text-[#FF6B00]">
            Detayli Rapor
          </Link>
        </div>

        <div className="panel-surface p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Operasyonel Durum</h3>

              <div className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-5">
                <div className="group flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Aktif Katilimci</p>
                      <h4 className="text-2xl font-extrabold text-slate-900">{stats.students.active.toLocaleString("tr-TR")}</h4>
                    </div>
                  </div>
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Aylik Faaliyet</p>
                      <h4 className="text-2xl font-extrabold text-slate-900">
                        {stats.programs.monthly_completed} / {stats.programs.monthly_total}
                      </h4>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Guncel Harcama</p>
                      <h4 className="text-2xl font-extrabold text-slate-900">
                        {stats.financials.monthly_expense.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    {stats.financials.expense_change_percent !== null && (
                      <>
                        <span
                          className={`text-[10px] font-bold ${stats.financials.expense_change_percent > 0 ? "text-red-500" : "text-emerald-500"}`}
                        >
                          {stats.financials.expense_change_percent > 0 ? "+" : ""}
                          {stats.financials.expense_change_percent}%
                        </span>
                        <p className="text-[8px] uppercase text-slate-400">Gecen aya gore</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-200/80 pt-4">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Bekleyen Islemler</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white p-2.5">
                      <span className="text-xs font-semibold text-slate-700">Yeni Basvurular</span>
                      <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">{stats.pending.applications} Adet</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white p-2.5">
                      <span className="text-xs font-semibold text-slate-700">Finansal Onaylar</span>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">{stats.pending.financials} Adet</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white p-2.5">
                      <span className="text-xs font-semibold text-slate-700">Destek Talepleri</span>
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">{stats.pending.support} Bekleyen</span>
                    </div>
                  </div>
                </div>
              </div>

              {isSuperAdmin ? (
                <div className="panel-surface border-sky-100/80 bg-sky-50/30 p-5">
                  <h4 className="mb-3 text-xs font-bold uppercase text-slate-800">Kullanici Dagilimi</h4>
                  <div className="space-y-2">
                    {Object.entries(stats.user_stats).map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-[#FF6B00]" />
                          <span className="capitalize">{role.replace(/_/g, " ")}</span>
                        </div>
                        <span className="font-bold text-slate-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-6 lg:col-span-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Proje Doluluk Oranlari (%)</h3>

              <div className="panel-surface p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase text-slate-500">Doluluk</h4>
                  <BarChart3 className="h-4 w-4 text-slate-400" />
                </div>
                {stats.project_occupancy.length === 0 ? (
                  <p className="text-sm text-slate-500">Gosterilecek proje verisi yok.</p>
                ) : (
                  <div className="space-y-4">
                    {stats.project_occupancy.map((project) => {
                      const rate = project.rate ?? 0;
                      return (
                        <div key={project.name} className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            <span className="truncate pr-1">{project.name}</span>
                            <span>
                              {project.active} / {project.max || "-"}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full bg-[#0a0b14]" style={{ width: `${Math.min(rate, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="panel-surface p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase text-slate-500">Aylik Iletisim (SMS)</h4>
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50 p-2.5">
                    <span className="text-xs font-semibold text-slate-700">Bu Ay</span>
                    <span className="text-sm font-extrabold text-slate-900">{stats.sms.total_this_month.toLocaleString("tr-TR")}</span>
                  </div>
                  {stats.sms.by_project.map((s) => (
                    <div key={s.project_id} className="flex justify-between text-[10px] text-slate-500">
                      <span>{s.project?.name || "Bilinmeyen"}</span>
                      <span className="font-medium text-slate-800">{s.count} SMS</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Zaman Cizelgesi</h3>

              <div className="panel-surface p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase text-slate-500">Yaklasan Programlar</h4>
                  <Link href="/panel/calendar" className="text-[10px] font-bold text-[#FF6B00] hover:underline">
                    Tumunu Gor
                  </Link>
                </div>
                {stats.upcoming_programs.length === 0 ? (
                  <p className="text-sm text-slate-500">Yaklasan etkinlik yok.</p>
                ) : (
                  <div className="space-y-3">
                    {stats.upcoming_programs.map((program) => {
                      const date = new Date(program.start_at);
                      return (
                        <div key={program.id} className="group flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-center">
                            <span className="text-[7px] font-bold uppercase text-slate-500">
                              {date.toLocaleDateString("tr-TR", { weekday: "short" }).toUpperCase()}
                            </span>
                            <span className="text-sm font-extrabold text-slate-900">{date.getDate()}</span>
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 transition-colors group-hover:text-[#FF6B00]">{program.title}</h5>
                            <p className="text-[10px] text-slate-500">
                              {date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} • {program.project?.name || "Genel"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <PermissionGate permission="announcements.create">
                <div className="panel-surface border-2 border-dashed border-slate-200/90 bg-slate-50/50 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase text-slate-500">Hizli Duyuru</h4>
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                  </div>
                  <select
                    value={quickAnnProject}
                    onChange={(e) => setQuickAnnProject(e.target.value)}
                    className="mb-2 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 outline-none"
                  >
                    <option value="all">Tum Kullanicilar (Genel)</option>
                    {stats.project_occupancy.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={quickAnnMessage}
                    onChange={(e) => setQuickAnnMessage(e.target.value)}
                    className="mb-2 min-h-[100px] w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 outline-none"
                    placeholder="Duyuru metni (e-posta)..."
                  />
                  <button
                    type="button"
                    onClick={() => void handleQuickAnnouncement()}
                    disabled={
                      sendingQuickAnn ||
                      !quickAnnMessage.trim() ||
                      (quickAnnProject !== "all" && !canAccessProject("announcements.create", parseInt(quickAnnProject, 10)))
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF6B00] py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#e85f00] disabled:opacity-50"
                  >
                    {sendingQuickAnn ? <Loader2 className="h-4 w-4 animate-spin" /> : quickAnnSuccess ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    {sendingQuickAnn ? "Gonderiliyor..." : quickAnnSuccess ? "Gonderildi!" : "Gonder"}
                  </button>
                </div>
              </PermissionGate>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
