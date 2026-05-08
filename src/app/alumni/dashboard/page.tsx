"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Award, Bell, BookOpen, Briefcase, Calendar, HeartHandshake, Loader2 } from "lucide-react";
import api from "@/lib/api/axios";
import { useAuth } from "@/store/useAuth";

interface BohcaMaterial {
  id: number;
  title: string;
  file_type?: string | null;
}

interface TicketItem {
  id: number;
  status?: string | null;
}

interface CertificateItem {
  id: number;
}

interface AlumniProject {
  id: number;
  name: string;
  type?: string | null;
  graduation_status?: string | null;
  graduated_at?: string | null;
}

interface SummaryResponse {
  monthly_titles?: string[];
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export default function AlumniDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<BohcaMaterial[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [projects, setProjects] = useState<AlumniProject[]>([]);
  const [monthlyTitles, setMonthlyTitles] = useState<string[]>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [bohcaResponse, ticketsResponse, annResponse, certResponse, projectResponse, summaryResponse] = await Promise.all([
          api.get<{ materials: BohcaMaterial[] }>("/digital-bohca").catch(() => ({ data: { materials: [] } })),
          api.get<{ tickets: TicketItem[] }>("/tickets").catch(() => ({ data: { tickets: [] } })),
          api.get<{ announcements: Announcement[] }>("/announcements").catch(() => ({ data: { announcements: [] } })),
          api.get<{ certificates: CertificateItem[] }>("/certificates").catch(() => ({ data: { certificates: [] } })),
          api.get<{ projects: AlumniProject[] }>("/dashboard/projects").catch(() => ({ data: { projects: [] } })),
          api.get<SummaryResponse>("/dashboard/summary").catch(() => ({ data: { monthly_titles: [] } })),
        ]);

        setMaterials(bohcaResponse.data.materials ?? []);
        setTickets(ticketsResponse.data.tickets ?? []);
        setAnnouncements(annResponse.data.announcements ?? []);
        setCertificates(certResponse.data.certificates ?? []);
        setProjects(projectResponse.data.projects ?? []);
        setMonthlyTitles(summaryResponse.data.monthly_titles ?? []);
      } catch (error) {
        console.error("Mezun dashboard verileri cekilemedi", error);
      } finally {
        setLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const openTickets = tickets.filter((ticket) => ticket.status !== "closed").length;
  const displayName = user?.name || "Mezun";

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Mezun Portali</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Hos geldin, {displayName}</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-muted-foreground">
            Mezun oldugun projeleri, duyurulari, sertifikalarini ve KADEME ile devam eden firsatlarini tek ekrandan takip edebilirsin.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/alumni/volunteer" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-muted">
            <HeartHandshake className="h-4 w-4" />
            Gonulluluk
          </Link>
          <Link href="/alumni/assignments" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-muted">
            <BookOpen className="h-4 w-4" />
            Odevlerim
          </Link>
          <Link href="/alumni/resume" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20">
            <Briefcase className="h-4 w-4" />
            Ozgecmisim
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Dijital Bohca Dosyalari" value={materials.length} icon={<BookOpen className="h-6 w-6" />} tone="blue" />
        <SummaryCard title="Acik Destek Talepleri" value={openTickets} icon={<HeartHandshake className="h-6 w-6" />} tone="rose" />
        <SummaryCard title="Sertifikalarim" value={certificates.length} icon={<Award className="h-6 w-6" />} tone="amber" />
        <SummaryCard title="Mezun Projelerim" value={projects.length} icon={<Briefcase className="h-6 w-6" />} tone="violet" />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="glass-panel rounded-3xl p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Mezun Oldugum Projeler</h2>
              <p className="mt-1 text-sm text-muted-foreground">KADEME gecmisin ve mezuniyet kayitlarin.</p>
            </div>
            <Link href="/alumni/portfolio" className="rounded-xl border border-border px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-muted">
              Portfolyo
            </Link>
          </div>

          {projects.length === 0 ? (
            <EmptyState message="Mezuniyet projesi kaydi gorunmuyor." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {projects.map((project) => (
                <article key={project.id} className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-slate-900">{project.name}</h3>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                      {project.type || "Proje"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {project.graduated_at
                      ? `Mezuniyet: ${new Date(project.graduated_at).toLocaleDateString("tr-TR")}`
                      : project.graduation_status || "Mezuniyet kaydi"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-3xl p-7">
          <div className="mb-5">
            <h2 className="text-lg font-black text-slate-900">Aylik Unvanlarim</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ay icinde kazandigin unvanlar burada gorunur.</p>
          </div>

          {monthlyTitles.length === 0 ? (
            <EmptyState message="Bu ay atanmis bir unvan gorunmuyor." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {monthlyTitles.map((title) => (
                <span key={title} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                  {title}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="glass-panel rounded-3xl p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Mezun Aksiyonu</h2>
              <p className="mt-1 text-sm text-muted-foreground">Sistemde aktif tutman gereken mezun islemleri.</p>
            </div>
          </div>

          <div className="space-y-3">
            <ActionCard
              title="Ozgecmisini guncel tut"
              description="Kariyer bilgilerini ve sosyal baglantilarini mezun ozgecmis ekranindan duzenleyebilirsin."
              href="/alumni/resume"
              cta="Ozgecmise git"
            />
            <ActionCard
              title="Gonulluluk firsatlarini takip et"
              description="Acik gonulluluk ilanlarina basvurabilir, proje ekipleriyle tekrar bag kurabilirsin."
              href="/alumni/volunteer"
              cta="Firsatlari gor"
            />
            <ActionCard
              title="Dijital bohca dosyalarina ulas"
              description="Mezuniyet sonrasinda seninle paylasilan dosya, belge ve icerikler burada saklanir."
              href="/alumni/bohca"
              cta="Bohcayi ac"
            />
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Guncel Duyurular</h2>
              <p className="mt-1 text-sm text-muted-foreground">Mezunlara acik duyurular ve sistem bildirimleri.</p>
            </div>
            <Link href="/alumni/announcements" className="rounded-xl border border-border px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-muted">
              Tumunu Gor
            </Link>
          </div>

          {announcements.length === 0 ? (
            <EmptyState icon={<Bell className="h-7 w-7" />} message="Aktif sistem duyurusu bulunmuyor." />
          ) : (
            <div className="space-y-3">
              {announcements.slice(0, 3).map((ann) => (
                <article key={ann.id} className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-900">{ann.title}</h3>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(ann.created_at).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{ann.content}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ title, value, icon, tone }: { title: string; value: number; icon: ReactNode; tone: "blue" | "rose" | "amber" | "violet" }) {
  const toneClasses = {
    blue: "bg-blue-500/10 text-blue-600",
    rose: "bg-rose-500/10 text-rose-600",
    amber: "bg-amber-500/10 text-amber-600",
    violet: "bg-violet-500/10 text-violet-600",
  } satisfies Record<typeof tone, string>;

  return (
    <div className="glass-panel flex items-center justify-between rounded-3xl p-6">
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
        <h3 className="text-3xl font-black text-slate-900">{value}</h3>
      </div>
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${toneClasses[tone]}`}>{icon}</div>
    </div>
  );
}

function ActionCard({ title, description, href, cta }: { title: string; description: string; href: string; cta: string }) {
  return (
    <article className="rounded-2xl border border-border bg-background/60 p-4">
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <Link href={href} className="mt-3 inline-flex text-xs font-bold uppercase tracking-widest text-primary hover:underline">
        {cta}
      </Link>
    </article>
  );
}

function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background/50 p-6 text-center text-sm text-muted-foreground">
      {icon ? <div className="mb-3 opacity-60">{icon}</div> : null}
      {message}
    </div>
  );
}
