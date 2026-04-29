"use client";

import { useEffect, useState } from "react";
import { Bell, CalendarDays, Loader2, Mail, MessageSquare, Users } from "lucide-react";
import api from "@/lib/api/axios";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { useAuth } from "@/store/useAuth";

interface AnnouncementProject {
  id: number;
  name: string;
}

interface AnnouncementCreator {
  id: number;
  name: string;
  surname: string;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  category?: string | null;
  project?: AnnouncementProject | null;
  creator?: AnnouncementCreator | null;
  published_at?: string | null;
  expires_at?: string | null;
}

interface PaginatedAnnouncements {
  data: Announcement[];
}

export default function StaffAnnouncementsPage() {
  const { hasPermission } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const canViewAnnouncements = hasPermission("announcements.view");
  const canExportAnnouncements = hasPermission("announcements.export");

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const response = await api.get<{ announcements: PaginatedAnnouncements }>("/panel/staff/announcements");
        setAnnouncements(response.data.announcements?.data ?? []);
      } catch (requestError) {
        console.error("Staff duyurulari yuklenemedi", requestError);
        setError("Personel duyurulari su anda yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadAnnouncements();
  }, []);

  const emailCount = announcements.filter((announcement) => announcement.category === "email").length;
  const smsCount = announcements.filter((announcement) => announcement.category === "sms").length;
  const projectScopedCount = announcements.filter((announcement) => announcement.project).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500">
            <Bell className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Duyurular</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Size acilan duyuru ve bildirimlerin canli listesi
            </p>
          </div>
        </div>
        {canExportAnnouncements && (
          <ExportButtons endpoint="/panel/staff/announcements/export" filename="personel_duyurulari" buttonLabel="Duyurulari Disa Aktar" />
        )}
      </div>

      {!canViewAnnouncements ? (
        <div className="glass-panel rounded-3xl p-10 text-center text-sm text-muted-foreground">
          Bu modulu goruntulemek icin yetkiniz bulunmuyor.
        </div>
      ) : (
        <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="glass-panel rounded-3xl p-6">
          <Mail className="mb-4 h-8 w-8 text-amber-500" />
          <h2 className="mb-2 text-lg font-bold text-slate-900">E-posta Duyurulari</h2>
          <p className="text-3xl font-black text-slate-900">{emailCount}</p>
          <p className="text-sm text-muted-foreground">Kategori olarak e-posta isaretlenen duyurular.</p>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <MessageSquare className="mb-4 h-8 w-8 text-amber-500" />
          <h2 className="mb-2 text-lg font-bold text-slate-900">SMS Bildirimleri</h2>
          <p className="text-3xl font-black text-slate-900">{smsCount}</p>
          <p className="text-sm text-muted-foreground">Kategori olarak SMS isaretlenen duyurular.</p>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <Users className="mb-4 h-8 w-8 text-amber-500" />
          <h2 className="mb-2 text-lg font-bold text-slate-900">Proje Baglantili</h2>
          <p className="text-3xl font-black text-slate-900">{projectScopedCount}</p>
          <p className="text-sm text-muted-foreground">Belirli bir projeye bagli olarak acilan duyurular.</p>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-8">
        <h3 className="mb-4 text-lg font-bold text-slate-900">Guncel Duyurular</h3>
        {loading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
        ) : announcements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-sm text-center text-muted-foreground">
            Bu role tanimli aktif bir duyuru bulunmuyor.
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="rounded-3xl border border-white/5 bg-white/5 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {announcement.category ? (
                        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">
                          {announcement.category}
                        </span>
                      ) : null}
                      {announcement.project ? (
                        <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {announcement.project.name}
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Genel duyuru
                        </span>
                      )}
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">{announcement.title}</h4>
                    <p className="text-sm leading-relaxed text-muted-foreground">{announcement.content}</p>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground md:text-right">
                    <div className="flex items-center gap-2 md:justify-end">
                      <CalendarDays className="h-4 w-4 text-amber-500" />
                      <span>
                        {announcement.published_at
                          ? new Date(announcement.published_at).toLocaleDateString("tr-TR")
                          : "Yayin tarihi yok"}
                      </span>
                    </div>
                    <div>
                      {announcement.creator
                        ? `${announcement.creator.name} ${announcement.creator.surname}`
                        : "Sistem"}
                    </div>
                    {announcement.expires_at ? <div>Bitis: {new Date(announcement.expires_at).toLocaleDateString("tr-TR")}</div> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
