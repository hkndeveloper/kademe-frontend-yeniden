"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Calendar, Clock, CreditCard, Download, Loader2, Quote, Star, Zap } from "lucide-react";
import api from "@/lib/api/axios";
import { useAuth } from "@/store/useAuth";
import { defaultSiteSettings, SiteSettingsResponse } from "@/lib/site-config";

interface DashboardParticipation {
  id: number;
  credit: number;
  project?: {
    id: number;
    name: string;
  };
}

interface DashboardBadge {
  id: number;
  name?: string;
}

interface DashboardSummaryResponse {
  participations: DashboardParticipation[];
  earned_badges: DashboardBadge[];
  monthly_titles?: string[];
  total_score: number;
  profile_badge_frame?: string | null;
}

interface ProgramItem {
  id: number;
  title: string;
  start_at: string;
}

interface BohcaMaterial {
  id: number;
  title: string;
  file_type?: string | null;
}

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totalScore, setTotalScore] = useState(0);
  const [participations, setParticipations] = useState<DashboardParticipation[]>([]);
  const [badges, setBadges] = useState<DashboardBadge[]>([]);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [materials, setMaterials] = useState<BohcaMaterial[]>([]);
  const [monthlyTitles, setMonthlyTitles] = useState<string[]>([]);
  const [profileBadgeFrame, setProfileBadgeFrame] = useState<string | null>(null);
  const [motivationMessage, setMotivationMessage] = useState<string>(defaultSiteSettings.homepage.monthly_motivation_message);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [summaryResponse, programsResponse, bohcaResponse, configResponse] = await Promise.all([
          api.get<DashboardSummaryResponse>("/dashboard/summary"),
          api.get<{ programs: ProgramItem[] }>("/programs"),
          api.get<{ materials: BohcaMaterial[] }>("/digital-bohca"),
          api.get<SiteSettingsResponse>("/site-config").catch(() => null),
        ]);

        setTotalScore(summaryResponse.data.total_score ?? 0);
        setParticipations(summaryResponse.data.participations ?? []);
        setBadges(summaryResponse.data.earned_badges ?? []);
        setMonthlyTitles(summaryResponse.data.monthly_titles ?? []);
        setProfileBadgeFrame(summaryResponse.data.profile_badge_frame ?? null);
        setPrograms((programsResponse.data.programs ?? []).slice(0, 3));
        setMaterials((bohcaResponse.data.materials ?? []).slice(0, 3));
        const msg = configResponse?.data?.settings?.homepage?.monthly_motivation_message;
        if (msg) setMotivationMessage(msg);
      } catch (error) {
        console.error("Ogrenci dashboard verileri cekilemedi", error);
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className={`text-3xl font-black text-slate-900 ${profileBadgeFrame ?? ""}`.trim()}>Merhaba, {user?.name?.toUpperCase()}!</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Ogrenci portali gelisim ozeti</p>
          {profileBadgeFrame ? <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-primary">KADEME+ rozet cercevesi aktif</p> : null}
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-2 text-primary">
          <Star className="h-5 w-5 fill-current" />
          <span className="text-xs font-black uppercase tracking-widest">
            {badges.length > 0 ? `${badges.length} rozet kazanildi` : "Rozet sistemi aktif"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-4">
          <h3 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-primary">Gelisim Durumu</h3>

          <div className="glass-panel group relative overflow-hidden rounded-3xl border-primary/20 bg-gradient-to-br from-primary/20 to-transparent p-6">
            <div className="relative z-10 mb-8 flex items-start justify-between">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">Mevcut Kredilerim</p>
                <h4 className="text-4xl font-black text-slate-900">
                  {totalScore.toLocaleString("tr-TR")} <span className="text-sm font-medium text-muted-foreground">puan</span>
                </h4>
              </div>
              <CreditCard className="h-8 w-8 text-primary/40 transition-colors group-hover:text-primary" />
            </div>

            <div className="relative z-10 space-y-3">
              {participations.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-white/5 p-3 text-sm text-muted-foreground">Henuz aktif proje kaydin gorunmuyor.</div>
              ) : (
                participations.slice(0, 3).map((participation) => (
                  <div key={participation.id} className="rounded-2xl border border-white/5 bg-white/5 p-3">
                    <p className="text-[8px] font-bold uppercase tracking-tighter text-muted-foreground">{participation.project?.name || "Proje"}</p>
                    <p className="text-sm font-black text-slate-900">{participation.credit?.toLocaleString("tr-TR") ?? 0}</p>
                  </div>
                ))
              )}
            </div>

            <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <h4 className="mb-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">Kazanilan Rozetler</h4>
            <div className="flex flex-wrap gap-4">
              {badges.length === 0 ? (
                <div className="text-sm text-muted-foreground">Henuz rozet gorunmuyor.</div>
              ) : (
                badges.slice(0, 6).map((badge) => (
                  <div
                    key={badge.id}
                    title={badge.name || "Rozet"}
                    className="group flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary transition-all hover:bg-primary hover:text-primary-foreground"
                  >
                    <Zap className="h-6 w-6" />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Aylik Unvanlar</h4>
            {monthlyTitles.length === 0 ? (
              <div className="text-sm text-muted-foreground">Bu ay icin atanmis bir unvan gorunmuyor.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {monthlyTitles.map((title) => (
                  <span
                    key={title}
                    className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary"
                  >
                    {title}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Durum Kartlari</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-[10px] font-black text-indigo-400">P</div>
                <span className="text-xs font-bold uppercase tracking-tighter text-slate-900">
                  {participations.length > 0 ? "Aktif katilimci" : "Basvuru veya kayit bekleniyor"}
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 opacity-80">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-[10px] font-black text-orange-400">R</div>
                <span className="text-xs font-bold uppercase tracking-tighter text-slate-900">
                  {badges.length > 0 ? "Rozet sahibi" : "Rozet henuz tanimlanmadi"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <h3 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-primary">Takvim ve Materyaller</h3>

          <div className="glass-panel rounded-3xl p-6">
            <div className="mb-6 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Yaklasan Programlar</h4>
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-4">
              {programs.length === 0 ? (
                <div className="text-sm text-muted-foreground">Yaklasan program bulunmuyor.</div>
              ) : (
                programs.map((program) => {
                  const date = new Date(program.start_at);
                  return (
                    <div key={program.id} className="flex items-center gap-4">
                      <div className="flex h-10 w-10 flex-col items-center justify-center rounded-xl border border-white/5 bg-white/5">
                        <span className="text-[8px] font-bold text-muted-foreground">{date.toLocaleDateString("tr-TR", { weekday: "short" }).toUpperCase()}</span>
                        <span className="text-sm font-black text-slate-900">{date.getDate()}</span>
                      </div>
                      <div className="flex-1">
                        <h5 className="text-xs font-bold text-slate-900">{program.title}</h5>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <div className="mb-6 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dijital Bohca</h4>
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-3">
              {materials.length === 0 ? (
                <div className="text-sm text-muted-foreground">Henuz materyal yuklenmemis.</div>
              ) : (
                materials.map((material) => (
                  <div key={material.id} className="group flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-3 transition-all hover:border-primary/40">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-muted-foreground transition-colors group-hover:text-primary">
                        <Download className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="w-32 truncate text-[10px] font-bold uppercase tracking-tighter text-slate-900">{material.title}</span>
                        <span className="text-[8px] font-bold text-muted-foreground">{material.file_type || "Dosya"}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                ))
              )}
            </div>
            <Link href="/student/bohca" className="mt-6 block w-full rounded-xl py-2 text-center text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/5">
              Tum dosyalarimi gor
            </Link>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <h3 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-primary">Aylik Motivasyon</h3>

          <div className="glass-panel relative flex h-full flex-col justify-center overflow-hidden rounded-[40px] border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-8 text-center">
            <Quote className="mx-auto mb-8 h-12 w-12 text-primary/20" />
            <p className="mb-8 text-xl font-bold italic leading-relaxed text-slate-900">
              &quot;{motivationMessage}&quot;
            </p>
            <div className="mx-auto mb-6 h-px w-20 bg-primary/30" />
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Aylik motivasyon notu</p>
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-[80px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
