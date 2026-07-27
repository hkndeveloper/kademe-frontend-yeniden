"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import Link from "next/link";
import { Award, BookOpen, BookMarked, Briefcase, Calendar, ChevronRight, Clock, Download, FileCheck, FileText, Gift, Handshake, Loader2, Trophy, Users } from "lucide-react";
import api from "@/lib/api/axios";
import { downloadBlobResponse } from "@/lib/download";

interface Participation {
  id: number;
  credit: number;
  status: string;
  graduation_status?: string | null;
  project?: {
    id: number;
    name: string;
    slug: string;
    short_description?: string;
    type?: string;
  };
  period?: {
    id: number;
    name: string;
    credit_threshold?: number;
  };
}

interface DashboardSummaryResponse {
  participations: Participation[];
  total_score: number;
}

interface Assignment {
  id: number;
  title: string;
  description?: string;
  due_date?: string | null;
  submissions?: Array<{
    id: number;
    status?: string;
  }>;
}

interface KademeModuleRow {
  id: number;
  title: string;
  description?: string | null;
  outcomes?: string[];
  instructors?: Array<{ name: string; bio?: string | null; photo_path?: string | null }>;
  faq_items?: Array<{ question: string; answer: string }>;
  warning_text?: string | null;
  requires_consent: boolean;
  consent_checkbox_label?: string | null;
  application_open: boolean;
  requires_coordinator_approval: boolean;
  enrollment?: { id: number; status: string; consented_at?: string | null; reviewed_at?: string | null; note?: string | null } | null;
}

interface LeaderboardRow {
  rank: number;
  user_id: number;
  display_name: string;
  university?: string | null;
  department?: string | null;
  badge_count: number;
  profile_badge_frame?: string | null;
}

interface ProjectSpecial {
  project: { id: number; name: string; type?: string | null };
  modules: string[];
  internships: Array<{ id: number; company_name: string; position: string; has_document?: boolean }>;
  mentors: Array<{ id: number; name: string; expertise?: string | null; bio?: string | null }>;
  uploaded_files?: Array<{ id: number; title: string; description?: string | null; file_type?: string | null; download_url: string }>;
  eurodesk_projects: Array<{ id: number; title: string; partner_organizations?: string[]; grant_amount?: string | number | null; grant_status: string }>;
  reward_tiers: Array<{ id: number; name: string; min_badges: number; min_credits: number; reward_description: string; eligible: boolean }>;
  reward_progress?: { badge_count: number; credit: number; eligible_count: number } | null;
  kademe_modules?: KademeModuleRow[];
}

function statusLabel(status?: string | null): string {
  const labels: Record<string, string> = {
    active: "Aktif katilimci",
    passive: "Pasif",
    graduated: "Mezun",
    failed: "Tamamlayamadi",
    waitlist: "Yedek",
    completed: "Tamamladi",
  };
  return status ? labels[status] ?? status : "-";
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}

function moduleEnrollmentLabel(status?: string | null): string {
  const labels: Record<string, string> = {
    pending: "Onay Bekleniyor",
    approved: "Onaylandi",
    rejected: "Reddedildi",
    revoked: "Iptal Edildi",
  };
  return status ? labels[status] ?? status : "-";
}

function moduleEnrollmentClass(status?: string | null): string {
  const classes: Record<string, string> = {
    pending: "border-amber-300 bg-amber-50 text-amber-800",
    approved: "border-emerald-300 bg-emerald-50 text-emerald-800",
    rejected: "border-rose-300 bg-rose-50 text-rose-800",
    revoked: "border-slate-300 bg-slate-100 text-slate-500",
  };
  return status && classes[status] ? classes[status] : "border-slate-200 bg-slate-50 text-slate-600";
}

export function MyProjectPortalPage({ portal }: { portal: "student" | "alumni" }) {
  const base = portal === "alumni" ? "/alumni" : "/student";
  const [loading, setLoading] = useState(true);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [specials, setSpecials] = useState<ProjectSpecial[]>([]);
  const [leaderboardByProject, setLeaderboardByProject] = useState<Record<number, LeaderboardRow[]>>({});
  const [enrolling, setEnrolling] = useState<{ projectId: number; moduleId: number } | null>(null);
  const [consentByModule, setConsentByModule] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadProjectData = async () => {
      try {
        const [summaryResponse, assignmentsResponse, specialsResponse] = await Promise.all([
          api.get<DashboardSummaryResponse>("/dashboard/summary"),
          api.get<{ assignments: Assignment[] }>("/assignments"),
          api.get<{ projects: ProjectSpecial[] }>("/dashboard/project-specials"),
        ]);

        setParticipations(summaryResponse.data.participations ?? []);
        setAssignments(assignmentsResponse.data.assignments ?? []);
        const projects = specialsResponse.data.projects ?? [];
        setSpecials(projects);

        const kademeProjectIds = projects
          .filter((p) => p.modules.includes("participants_by_module"))
          .map((p) => p.project.id);

        const boardEntries = await Promise.all(
          kademeProjectIds.map(async (pid) => {
            try {
              const res = await api.get<{ leaderboard: LeaderboardRow[] }>(`/dashboard/projects/${pid}/badge-leaderboard`);
              return [pid, res.data.leaderboard ?? []] as const;
            } catch {
              return [pid, []] as const;
            }
          }),
        );
        setLeaderboardByProject(Object.fromEntries(boardEntries));
      } catch (error) {
        console.error("Projem verileri cekilemedi", error);
      } finally {
        setLoading(false);
      }
    };

    window.setTimeout(() => {
      void loadProjectData();
    }, 0);
  }, []);

  const activeParticipation = participations[0] ?? null;
  const activeProjectName = activeParticipation?.project?.name || "Aktif Proje Bulunamadi";
  const activeThreshold = activeParticipation?.period?.credit_threshold ?? 100;
  const progress = activeThreshold > 0 ? Math.min(Math.round(((activeParticipation?.credit ?? 0) / activeThreshold) * 100), 100) : 0;
  const activeSpecial = specials.find((item) => item.project.id === activeParticipation?.project?.id) ?? specials[0] ?? null;

  async function enrollModule(projectId: number, module: KademeModuleRow) {
    if (module.requires_consent && !consentByModule[`${projectId}-${module.id}`]) {
      return;
    }
    setEnrolling({ projectId, moduleId: module.id });
    try {
      await api.post(`/dashboard/projects/${projectId}/kademe-modules/${module.id}/enroll`, {
        accepted_terms: true,
      });
      const res = await api.get<{ projects: ProjectSpecial[] }>("/dashboard/project-specials");
      setSpecials(res.data.projects ?? []);
      try {
        const board = await api.get<{ leaderboard: LeaderboardRow[] }>(`/dashboard/projects/${projectId}/badge-leaderboard`);
        setLeaderboardByProject((prev) => ({ ...prev, [projectId]: board.data.leaderboard ?? [] }));
      } catch {
        /* ignore */
      }
    } catch (e) {
      console.error("Modul kaydi basarisiz", e);
    } finally {
      setEnrolling(null);
    }
  }

  const assignmentSummary = useMemo(() => {
    const submitted = assignments.filter((assignment) => (assignment.submissions?.length ?? 0) > 0).length;
    return {
      total: assignments.length,
      submitted,
      pending: Math.max(assignments.length - submitted, 0),
    };
  }, [assignments]);

  const nextAssignment = useMemo(() => {
    return assignments
      .filter((assignment) => (assignment.submissions?.length ?? 0) === 0 && assignment.due_date)
      .sort((a, b) => new Date(a.due_date || "").getTime() - new Date(b.due_date || "").getTime())[0];
  }, [assignments]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-primary/20 bg-primary/20 text-primary">
          <Briefcase className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">{activeProjectName}</h1>
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {portal === "alumni" ? "Mezun proje ozetin ve KADEME araclari" : "Proje detaylari ve araclar"}
          </p>
          {activeParticipation?.period?.name ? (
            <p className="mt-2 text-xs font-black uppercase tracking-widest text-primary">
              {portal === "alumni" ? "Mezuniyet donemi" : "Katilim donemi"}: {activeParticipation.period.name}
            </p>
          ) : null}
        </div>
      </div>

      {!activeParticipation ? (
        <div className="glass-panel rounded-[32px] p-12 text-center">
          <h2 className="mb-3 text-2xl font-bold text-slate-900">Aktif proje kaydi gorunmuyor</h2>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Bu ekran kabul edildigin aktif veya mezun oldugun proje katilimi uzerinden calisir. Basvurun kabul edildiginde proje iceriklerin burada gorunur.
          </p>
          <Link
            href={portal === "alumni" ? `${base}/programs` : `${base}/applications`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
          >
            {portal === "alumni" ? "Program gecmisim" : "Basvurularimi Gor"}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Link href={`${base}/bohca`} className="glass-panel group rounded-[28px] p-8 transition-all hover:border-primary/40">
                <BookOpen className="mb-6 h-10 w-10 text-primary" />
                <h3 className="mb-2 text-xl font-bold">Dijital Bohca</h3>
                <p className="mb-6 text-sm text-muted-foreground">Bu projeye ait belge, dosya ve materyallere buradan ulasabilirsin.</p>
                <span className="flex items-center gap-2 text-sm font-bold text-primary">
                  Dosyalara Git
                  <ChevronRight className="h-4 w-4" />
                </span>
              </Link>

              <Link href={`${base}/assignments`} className="glass-panel group rounded-[28px] p-8 transition-all hover:border-primary/40">
                <FileCheck className="mb-6 h-10 w-10 text-primary" />
                <h3 className="mb-2 text-xl font-bold">Odev Gonderimi</h3>
                <p className="mb-6 text-sm text-muted-foreground">Aktif proje donemine ait odevleri ve teslim durumunu takip et.</p>
                <span className="flex items-center gap-2 text-sm font-bold text-primary">
                  Odevleri Gor
                  <ChevronRight className="h-4 w-4" />
                </span>
              </Link>
            </div>

            <div className="glass-panel rounded-[32px] border-primary/20 bg-primary/5 p-8">
              <h3 className="mb-8 text-2xl font-black">Proje Ozeti</h3>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <InfoPanel title="Katilim Bilgisi">
                  <InfoLine icon={<Calendar className="h-4 w-4" />} label="Donem" value={activeParticipation.period?.name || "Bilinmiyor"} />
                  <InfoLine icon={<FileText className="h-4 w-4" />} label="Durum" value={statusLabel(activeParticipation.status)} />
                  {activeParticipation.graduation_status ? (
                    <InfoLine icon={<Award className="h-4 w-4" />} label="Mezuniyet" value={statusLabel(activeParticipation.graduation_status)} />
                  ) : null}
                </InfoPanel>

                <InfoPanel title="Odev Ozeti">
                  <InfoLine label="Toplam odev" value={String(assignmentSummary.total)} />
                  <InfoLine label="Teslim edilen" value={String(assignmentSummary.submitted)} />
                  <InfoLine label="Bekleyen" value={String(assignmentSummary.pending)} />
                </InfoPanel>
              </div>


              {activeSpecial ? (
                <ProjectSpecialSection
                  special={activeSpecial}
                  leaderboard={leaderboardByProject[activeSpecial.project.id] ?? []}
                  consentByModule={consentByModule}
                  setConsentByModule={setConsentByModule}
                  enrolling={enrolling}
                  onEnroll={enrollModule}
                />
              ) : null}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-1">
            <div className="glass-panel rounded-[32px] p-8">
              <h3 className="mb-6 text-xs font-black uppercase tracking-widest text-muted-foreground">Proje Karnesi</h3>
              <div className="space-y-8">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Mevcut Kredi</p>
                  <h4 className="text-4xl font-black text-slate-900">
                    {activeParticipation.credit?.toLocaleString("tr-TR") ?? 0}
                    <span className="text-xs text-primary"> / {activeThreshold.toLocaleString("tr-TR")}</span>
                  </h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase">
                    <span>Sertifika ilerlemesi</span>
                    <span>%{progress}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <Link href={`${base}/certificates`} className="glass-panel flex flex-col items-center rounded-[32px] border-dashed border-primary/20 p-8 text-center transition hover:border-primary/50">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Award className="h-8 w-8" />
              </div>
              <h4 className="mb-2 text-sm font-bold">Sertifikalarim</h4>
              <p className="mb-6 text-[10px] uppercase tracking-widest text-muted-foreground">Katilim belgeleri ve sertifikalari goruntule</p>
              <span className="w-full rounded-xl bg-primary py-3 text-[10px] font-black uppercase tracking-widest text-primary-foreground">Sertifikalara Git</span>
            </Link>

            <div className="glass-panel rounded-[32px] p-8">
              <h3 className="mb-4 text-lg font-bold text-slate-900">Yaklasan Teslim</h3>
              {nextAssignment ? (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="font-bold text-slate-900">{nextAssignment.title}</div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    {formatDate(nextAssignment.due_date)}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Bekleyen teslim tarihi olan odev gorunmuyor.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/40 bg-white/60 p-6">
      <h4 className="mb-3 text-lg font-bold text-slate-900">{title}</h4>
      <div className="space-y-3 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function InfoLine({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon ? <span className="text-primary">{icon}</span> : null}
      <span className="font-semibold text-slate-700">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function ProjectSpecialSection({
  special,
  leaderboard,
  consentByModule,
  setConsentByModule,
  enrolling,
  onEnroll,
}: {
  special: ProjectSpecial;
  leaderboard: LeaderboardRow[];
  consentByModule: Record<string, boolean>;
  setConsentByModule: Dispatch<SetStateAction<Record<string, boolean>>>;
  enrolling: { projectId: number; moduleId: number } | null;
  onEnroll: (projectId: number, module: KademeModuleRow) => void;
}) {
  const pid = special.project.id;
  const mods = special.kademe_modules ?? [];

  async function downloadUploadedFile(item: NonNullable<ProjectSpecial["uploaded_files"]>[number]) {
    try {
      const response = await api.get(item.download_url, { responseType: "blob" });
      await downloadBlobResponse(response.data, response.headers, item.title || `dosya-${item.id}`);
    } catch (error) {
      console.error("Proje dosyasi indirilemedi", error);
    }
  }

  return (
    <div className="mt-8 rounded-3xl border border-white/40 bg-white/60 p-6">
      <h4 className="mb-4 text-lg font-bold text-slate-900">Projeye Ozel Icerikler</h4>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {special.modules.includes("internships") ? (
          <SpecialBox icon={<Briefcase className="h-5 w-5" />} title="Staj Bilgileri">
            {special.internships.length === 0 ? (
              <p>Staj kaydi bulunmuyor.</p>
            ) : (
              special.internships.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-100 p-3">
                  <div className="font-bold text-slate-900">{item.company_name}</div>
                  <div>
                    {item.position}
                    {item.has_document ? " - belge yuklendi" : ""}
                  </div>
                </div>
              ))
            )}
          </SpecialBox>
        ) : null}

        {special.modules.includes("mentors") ? (
          <SpecialBox icon={<Users className="h-5 w-5" />} title="Mentor Bilgileri">
            {special.mentors.length === 0 ? (
              <p>Mentor bilgisi bulunmuyor.</p>
            ) : (
              special.mentors.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-100 p-3">
                  <div className="font-bold text-slate-900">{item.name}</div>
                  <div>{item.expertise || "Uzmanlik girilmemis"}</div>
                </div>
              ))
            )}
          </SpecialBox>
        ) : null}

        {special.modules.includes("uploaded_files") ? (
          <SpecialBox icon={<Download className="h-5 w-5" />} title="Yuklenen Dosyalar">
            {(special.uploaded_files ?? []).length === 0 ? (
              <p>Bu projeye ait gorunur dosya bulunmuyor.</p>
            ) : (
              (special.uploaded_files ?? []).slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void downloadUploadedFile(item)}
                  className="block w-full rounded-2xl bg-slate-100 p-3 text-left transition hover:bg-slate-200"
                >
                  <div className="font-bold text-slate-900">{item.title}</div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><Download className="h-3.5 w-3.5" /> Indir {item.file_type ? `(${item.file_type})` : ""}</div>
                </button>
              ))
            )}
          </SpecialBox>
        ) : null}

        {special.modules.includes("eurodesk_projects") ? (
          <SpecialBox icon={<Handshake className="h-5 w-5" />} title="Eurodesk Projeleri">
            {special.eurodesk_projects.length === 0 ? (
              <p>Eurodesk proje kaydi bulunmuyor.</p>
            ) : (
              special.eurodesk_projects.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-100 p-3">
                  <div className="font-bold text-slate-900">{item.title}</div>
                  <div>
                    {item.grant_status}
                    {item.grant_amount ? ` - ${item.grant_amount}` : ""}
                  </div>
                </div>
              ))
            )}
          </SpecialBox>
        ) : null}

        {special.modules.includes("reward_tiers") ? (
          <SpecialBox icon={<Gift className="h-5 w-5" />} title="Hediye Haklari">
            <p>
              {special.reward_progress?.badge_count ?? 0} rozet / {special.reward_progress?.credit ?? 0} kredi
            </p>
            {special.reward_tiers.length === 0 ? (
              <p>Hediye kademesi tanimli degil.</p>
            ) : (
              special.reward_tiers.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-100 p-3">
                  <div className="font-bold text-slate-900">{item.name}</div>
                  <div>{item.eligible ? "Hak kazanildi" : `${item.min_badges} rozet / ${item.min_credits} kredi`}</div>
                </div>
              ))
            )}
          </SpecialBox>
        ) : null}
      </div>

      {special.modules.includes("participants_by_module") && mods.length > 0 ? (
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2 font-bold text-slate-900">
            <BookMarked className="h-5 w-5 text-primary" />
            KADEME+ Modulleri
          </div>
          <div className="space-y-6">
            {mods.map((mod) => (
              <div key={mod.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-slate-900">{mod.title}</div>
                    {mod.description ? <p className="mt-1 max-w-2xl text-muted-foreground">{mod.description}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${mod.application_open ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                      {mod.application_open ? "Basvuru acik" : "Basvuru kapali"}
                    </span>
                    {mod.requires_coordinator_approval ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">Onayli kayit</span>
                    ) : null}
                  </div>
                </div>
                {(mod.outcomes ?? []).length > 0 ? (
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {(mod.outcomes ?? []).map((o) => (
                      <div key={o} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">{o}</div>
                    ))}
                  </div>
                ) : null}
                {(mod.instructors ?? []).length > 0 ? (
                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Egitmenler</div>
                    <div className="space-y-2">
                      {(mod.instructors ?? []).map((instructor, idx) => (
                        <div key={`${instructor.name}-${idx}`} className="text-xs text-slate-700">
                          <span className="font-black text-slate-900">{instructor.name}</span>
                          {instructor.bio ? <span className="text-muted-foreground"> - {instructor.bio}</span> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {(mod.faq_items ?? []).length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sik sorulanlar</div>
                    {(mod.faq_items ?? []).map((f, idx) => (
                      <details key={`${f.question}-${idx}`} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <summary className="cursor-pointer text-xs font-black text-slate-800">{f.question}</summary>
                        <div className="mt-2 text-xs text-muted-foreground">{f.answer}</div>
                      </details>
                    ))}
                  </div>
                ) : null}
                {mod.warning_text ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
                    <div className="text-[10px] font-black uppercase tracking-widest">Uyari ve yaptirimlar</div>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-5">{mod.warning_text}</p>
                  </div>
                ) : null}
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {mod.enrollment ? (
                    <div className="space-y-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${moduleEnrollmentClass(mod.enrollment.status)}`}>
                        {moduleEnrollmentLabel(mod.enrollment.status)}
                      </span>
                      <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                        <span>Basvuru: {formatDate(mod.enrollment.consented_at)}</span>
                        <span>Inceleme: {formatDate(mod.enrollment.reviewed_at)}</span>
                      </div>
                      {mod.enrollment.note ? <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-700">{mod.enrollment.note}</div> : null}
                    </div>
                  ) : mod.application_open ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <FileCheck className="mt-0.5 h-4 w-4 text-primary" />
                        <span>{mod.requires_coordinator_approval ? "Basvurunuz gonderildikten sonra koordinator onayina dusecek." : "Basvurunuz gonderildiginde modul kaydiniz otomatik onaylanacak."}</span>
                      </div>
                      {mod.requires_consent ? (
                        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={Boolean(consentByModule[`${pid}-${mod.id}`])}
                            onChange={(e) =>
                              setConsentByModule((prev) => ({
                                ...prev,
                                [`${pid}-${mod.id}`]: e.target.checked,
                              }))
                            }
                          />
                          <span>{mod.consent_checkbox_label || "Okudum, kabul ediyorum."}</span>
                        </label>
                      ) : null}
                      <button
                        type="button"
                        disabled={Boolean(enrolling && enrolling.projectId === pid && enrolling.moduleId === mod.id) || (mod.requires_consent && !consentByModule[`${pid}-${mod.id}`])}
                        onClick={() => onEnroll(pid, mod)}
                        className="inline-flex w-fit items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {enrolling && enrolling.projectId === pid && enrolling.moduleId === mod.id ? "Kaydediliyor..." : mod.requires_coordinator_approval ? "Basvuruyu gonder" : "Module kayit ol"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Bu modul icin basvuru kapali.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {special.modules.includes("participants_by_module") && leaderboard.length > 0 ? (
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2 font-bold text-slate-900">
            <Trophy className="h-5 w-5 text-primary" />
            Rozet liderlik tablosu (motivasyon)
          </div>
          <p className="mb-4 text-xs text-muted-foreground">Aktif katilimcilarin KADEME+ rozet sayisina gore siralanmis ozeti. E-posta ve hassas veriler gosterilmez.</p>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {leaderboard.slice(0, 20).map((row) => (
              <div key={row.user_id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-xs font-black text-primary">#{row.rank}</span>
                  <div>
                    <div className={`font-semibold text-slate-900 ${row.profile_badge_frame ?? ""}`}>{row.display_name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {[row.university, row.department].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary">{row.badge_count} rozet</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SpecialBox({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-muted-foreground">
      <div className="mb-3 flex items-center gap-2 font-bold text-slate-900">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
