"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Briefcase, Calendar, CheckCircle2, LifeBuoy, Loader2, UserCircle } from "lucide-react";
import api from "@/lib/api/axios";
import { useAuth } from "@/store/useAuth";

interface Ticket {
  id: number;
  subject: string;
  status: string;
  category: string;
  created_at: string;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

interface PaginatedAnnouncements {
  data: Announcement[];
}

interface ProfileResponse {
  user: {
    phone?: string | null;
    email?: string | null;
    role?: string | null;
    department?: string | null;
  };
}

interface CalendarProgram {
  id: number;
  title: string;
  start_at: string;
  project?: {
    name: string;
  } | null;
  calendar_event?: {
    is_assigned_to_current_user?: boolean;
  } | null;
}

interface CalendarOverviewResponse {
  programs: CalendarProgram[];
}

export default function StaffDashboardPage() {
  const { user, hasPermission } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [department, setDepartment] = useState<string>("");
  const [calendarPrograms, setCalendarPrograms] = useState<CalendarProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const announcementsPromise = hasPermission("announcements.view")
          ? api
              .get<{ announcements: PaginatedAnnouncements }>("/panel/staff/announcements")
              .catch(() => ({ data: { announcements: { data: [] as Announcement[] } } }))
          : Promise.resolve({ data: { announcements: { data: [] as Announcement[] } } });
        const calendarPromise = hasPermission("calendar.view")
          ? api.get<CalendarOverviewResponse>("/calendar/overview").catch(() => ({ data: { programs: [] as CalendarProgram[] } }))
          : Promise.resolve({ data: { programs: [] as CalendarProgram[] } });

        const [ticketResponse, profileResponse, annResponse, calendarResponse] = await Promise.all([
          api.get<{ tickets: Ticket[] }>("/tickets"),
          api.get<ProfileResponse>("/user/profile"),
          announcementsPromise,
          calendarPromise,
        ]);

        setTickets(ticketResponse.data.tickets ?? []);
        setDepartment(profileResponse.data.user.department ?? "");
        setAnnouncements(annResponse.data.announcements?.data ?? []);
        setCalendarPrograms(calendarResponse.data.programs ?? []);
      } catch (error) {
        console.error("Personel dashboard verileri yuklenemedi", error);
      } finally {
        setLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [hasPermission]);

  const openTickets = tickets.filter((ticket) => ticket.status !== "resolved" && ticket.status !== "closed");

  const upcomingAssignedPrograms = useMemo(() => {
    return calendarPrograms
      .filter((program) => !!program.calendar_event?.is_assigned_to_current_user && new Date(program.start_at) >= new Date())
      .sort((left, right) => new Date(left.start_at).getTime() - new Date(right.start_at).getTime())
      .slice(0, 4);
  }, [calendarPrograms]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Personel Paneli</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Sistem ozeti, gorev takvimi ve aktif isleriniz
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/panel/calendar" className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all hover:bg-white/5">
            <Calendar className="h-4 w-4" />
            Takvim
          </Link>
          <Link href="/panel/support" className="rounded-xl border border-white/10 px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all hover:bg-white/5">
            Destek
          </Link>
          <Link href="/panel/profile" className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-amber-500/20">
            Profilim
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="glass-panel rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-amber-500/70">Mevcut Rolunuz</p>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500">
              <UserCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-black capitalize text-slate-900">{user?.role || "Personel"}</p>
              <p className="text-xs text-amber-200/50">{department || "Birim: Genel"}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Acik Destek Talepleriniz</p>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
              <LifeBuoy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900">{openTickets.length}</p>
              <p className="text-xs text-muted-foreground">Islem bekleyen</p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sistem Duyurulari</p>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/10 text-green-500">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900">{announcements.length}</p>
              <p className="text-xs text-muted-foreground">Aktif duyuru</p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Atanan Gorevlerim</p>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900">{upcomingAssignedPrograms.length}</p>
              <p className="text-xs text-muted-foreground">Yaklasan gorev</p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Toplam Islemler</p>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900">{tickets.length}</p>
              <p className="text-xs text-muted-foreground">Tum zamanlar</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="glass-panel rounded-3xl p-8 lg:col-span-1">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
            <Calendar className="h-5 w-5 text-amber-500" />
            Bana Atanan Gorevler
          </h2>
          <div className="space-y-4">
            {upcomingAssignedPrograms.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-muted-foreground">
                Henuz size atanmis yakin tarihli etkinlik bulunmuyor.
              </div>
            ) : (
              upcomingAssignedPrograms.map((program) => (
                <div key={program.id} className="rounded-2xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
                  <div className="text-sm font-bold text-slate-900">{program.title}</div>
                  <div className="mt-1 text-xs uppercase tracking-widest text-amber-300">{program.project?.name || "Genel"}</div>
                  <p className="mt-2 text-xs text-muted-foreground">{new Date(program.start_at).toLocaleString("tr-TR")}</p>
                </div>
              ))
            )}
          </div>
          <Link href="/panel/calendar" className="mt-4 block text-center text-xs font-bold uppercase tracking-widest text-amber-500 hover:text-amber-400">
            Takvimde Tumunu Gor
          </Link>
        </div>

        <div className="glass-panel rounded-3xl p-8 lg:col-span-1">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
            <LifeBuoy className="h-5 w-5 text-amber-500" />
            Son Destek Kayitlari
          </h2>
          <div className="space-y-4">
            {tickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-muted-foreground">
                Hesabiniza ait destek kaydi bulunmuyor.
              </div>
            ) : (
              tickets.slice(0, 5).map((ticket) => (
                <div key={ticket.id} className="rounded-2xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{ticket.subject}</h3>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {ticket.category}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${ticket.status === "resolved" || ticket.status === "closed" ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"}`}>
                      {ticket.status === "closed" ? "Kapali" : ticket.status === "resolved" ? "Cozuldu" : ticket.status}
                    </span>
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(ticket.created_at).toLocaleString("tr-TR")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 lg:col-span-1">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
            <Bell className="h-5 w-5 text-green-500" />
            Guncel Duyurular
          </h2>
          <div className="space-y-4">
            {announcements.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-muted-foreground">
                Aktif sistem duyurusu bulunmuyor.
              </div>
            ) : (
              announcements.slice(0, 3).map((announcement) => (
                <div key={announcement.id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-sm font-bold text-slate-900">{announcement.title}</h3>
                    <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                      {new Date(announcement.created_at).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {announcement.content}
                  </p>
                </div>
              ))
            )}
          </div>
          <Link href="/panel/requests" className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-900 transition-colors hover:bg-white/10">
            Izin ve IK Talepleri
          </Link>
        </div>
      </div>
    </div>
  );
}
