"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Award, BookOpen, Briefcase, Calendar, ChevronRight, Clock, FileCheck, FileText, Gift, Handshake, Loader2, Users } from "lucide-react";
import api from "@/lib/api/axios";

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

interface BohcaMaterial {
  id: number;
  title: string;
  file_type?: string | null;
}

interface ProjectSpecial {
  project: { id: number; name: string; type?: string | null };
  modules: string[];
  internships: Array<{ id: number; company_name: string; position: string; has_document?: boolean }>;
  mentors: Array<{ id: number; name: string; expertise?: string | null; bio?: string | null }>;
  eurodesk_projects: Array<{ id: number; title: string; partner_organizations?: string[]; grant_amount?: string | number | null; grant_status: string }>;
  reward_tiers: Array<{ id: number; name: string; min_badges: number; min_credits: number; reward_description: string; eligible: boolean }>;
  reward_progress?: { badge_count: number; credit: number; eligible_count: number } | null;
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

export default function StudentMyProjectPage() {
  const [loading, setLoading] = useState(true);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<BohcaMaterial[]>([]);
  const [specials, setSpecials] = useState<ProjectSpecial[]>([]);

  useEffect(() => {
    const loadProjectData = async () => {
      try {
        const [summaryResponse, assignmentsResponse, bohcaResponse, specialsResponse] = await Promise.all([
          api.get<DashboardSummaryResponse>("/dashboard/summary"),
          api.get<{ assignments: Assignment[] }>("/assignments"),
          api.get<{ materials: BohcaMaterial[] }>("/digital-bohca"),
          api.get<{ projects: ProjectSpecial[] }>("/dashboard/project-specials"),
        ]);

        setParticipations(summaryResponse.data.participations ?? []);
        setAssignments(assignmentsResponse.data.assignments ?? []);
        setMaterials(bohcaResponse.data.materials ?? []);
        setSpecials(specialsResponse.data.projects ?? []);
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
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Proje detaylari ve araclar</p>
        </div>
      </div>

      {!activeParticipation ? (
        <div className="glass-panel rounded-[32px] p-12 text-center">
          <h2 className="mb-3 text-2xl font-bold text-slate-900">Aktif proje kaydi gorunmuyor</h2>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Bu ekran kabul edildigin aktif veya mezun oldugun proje katilimi uzerinden calisir. Basvurun kabul edildiginde proje iceriklerin burada gorunur.
          </p>
          <Link href="/student/applications" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">
            Basvurularimi Gor
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Link href="/student/bohca" className="glass-panel group rounded-[28px] p-8 transition-all hover:border-primary/40">
                <BookOpen className="mb-6 h-10 w-10 text-primary" />
                <h3 className="mb-2 text-xl font-bold">Dijital Bohca</h3>
                <p className="mb-6 text-sm text-muted-foreground">Bu projeye ait belge, dosya ve materyallere buradan ulasabilirsin.</p>
                <span className="flex items-center gap-2 text-sm font-bold text-primary">
                  Dosyalara Git
                  <ChevronRight className="h-4 w-4" />
                </span>
              </Link>

              <Link href="/student/assignments" className="glass-panel group rounded-[28px] p-8 transition-all hover:border-primary/40">
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

              <div className="mt-8 rounded-3xl border border-white/40 bg-white/60 p-6">
                <h4 className="mb-4 text-lg font-bold text-slate-900">Son Materyaller</h4>
                <div className="space-y-3">
                  {materials.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Bu proje icin gorunur materyal bulunmuyor.</div>
                  ) : (
                    materials.slice(0, 3).map((material) => (
                      <div key={material.id} className="flex items-center justify-between rounded-2xl bg-slate-100 p-3">
                        <span className="text-sm font-semibold text-slate-900">{material.title}</span>
                        <span className="text-xs uppercase text-muted-foreground">{material.file_type || "dosya"}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {activeSpecial ? <ProjectSpecialSection special={activeSpecial} /> : null}
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

            <Link href="/student/certificates" className="glass-panel flex flex-col items-center rounded-[32px] border-dashed border-primary/20 p-8 text-center transition hover:border-primary/50">
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

function ProjectSpecialSection({ special }: { special: ProjectSpecial }) {
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
