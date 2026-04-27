"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Briefcase, Award, FileCheck, ChevronRight, Loader2, Calendar, Clock, FileText } from "lucide-react";
import api from "@/lib/api/axios";

interface Participation {
  id: number;
  credit: number;
  status: string;
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

export default function StudentMyProjectPage() {
  const [loading, setLoading] = useState(true);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<BohcaMaterial[]>([]);

  useEffect(() => {
    const loadProjectData = async () => {
      try {
        const [summaryResponse, assignmentsResponse, bohcaResponse] = await Promise.all([
          api.get<DashboardSummaryResponse>("/dashboard/summary"),
          api.get<{ assignments: Assignment[] }>("/assignments"),
          api.get<{ materials: BohcaMaterial[] }>("/digital-bohca"),
        ]);

        setParticipations(summaryResponse.data.participations ?? []);
        setAssignments(assignmentsResponse.data.assignments ?? []);
        setMaterials(bohcaResponse.data.materials ?? []);
      } catch (error) {
        console.error("Projem verileri çekilemedi", error);
      } finally {
        setLoading(false);
      }
    };

    void loadProjectData();
  }, []);

  const activeParticipation = participations[0] ?? null;
  const activeProjectName = activeParticipation?.project?.name || "Aktif Proje Bulunamadı";
  const activeThreshold = activeParticipation?.period?.credit_threshold ?? 1000;

  const assignmentSummary = useMemo(() => {
    const submitted = assignments.filter((assignment) => (assignment.submissions?.length ?? 0) > 0).length;
    return {
      total: assignments.length,
      submitted,
      pending: Math.max(assignments.length - submitted, 0),
    };
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
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">PROJE DETAYLARI VE ARAÇLAR</p>
        </div>
      </div>

      {!activeParticipation ? (
        <div className="glass-panel rounded-[40px] p-12 text-center">
          <h2 className="mb-3 text-2xl font-bold text-slate-900">Aktif proje kaydı görünmüyor</h2>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Bu ekran, öğrencinin kabul edildiği aktif proje katılımı üzerinden çalışır. Şu an hesabınız için aktif `participant` kaydı bulunmadığı için proje içeriği gösterilemiyor.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Link href="/student/bohca" className="glass-panel group cursor-pointer rounded-[32px] p-8 transition-all hover:border-primary/40">
                <BookOpen className="mb-6 h-10 w-10 text-primary" />
                <h3 className="mb-2 text-xl font-bold">Dijital Bohça</h3>
                <p className="mb-6 text-sm text-muted-foreground">Bu projeye ait erişilebilir belge ve materyaller artık gerçek bohça verisinden geliyor.</p>
                <span className="flex items-center gap-2 text-sm font-bold text-primary">
                  Dosyalara Git
                  <ChevronRight className="h-4 w-4" />
                </span>
              </Link>

              <div className="glass-panel group rounded-[32px] p-8 transition-all hover:border-primary/40">
                <FileCheck className="mb-6 h-10 w-10 text-primary" />
                <h3 className="mb-2 text-xl font-bold">Ödev Gönderimi</h3>
                <p className="mb-6 text-sm text-muted-foreground">Aktif proje dönemine ait ödevler gerçek `/assignments` verisiyle listeleniyor.</p>
                <Link href="/student/assignments" className="flex items-center gap-2 text-sm font-bold text-primary">
                  Ödevleri Gör
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="glass-panel rounded-[40px] border-primary/20 bg-primary/5 p-10">
              <h3 className="mb-8 text-2xl font-black">PROJE ÖZETİ</h3>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-white/5 bg-white/5 p-6">
                  <h4 className="mb-3 text-lg font-bold text-slate-900">Katılım Bilgisi</h4>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Dönem: {activeParticipation.period?.name || "Bilinmiyor"}
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Durum: {activeParticipation.status}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/5 bg-white/5 p-6">
                  <h4 className="mb-3 text-lg font-bold text-slate-900">Ödev Özeti</h4>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div>Toplam ödev: {assignmentSummary.total}</div>
                    <div>Teslim edilen: {assignmentSummary.submitted}</div>
                    <div>Bekleyen: {assignmentSummary.pending}</div>
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-white/5 bg-white/5 p-6">
                <h4 className="mb-4 text-lg font-bold text-slate-900">Son Materyaller</h4>
                <div className="space-y-3">
                  {materials.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Bu proje için görünür materyal bulunmuyor.</div>
                  ) : (
                    materials.slice(0, 3).map((material) => (
                      <div key={material.id} className="flex items-center justify-between rounded-2xl bg-black/10 p-3">
                        <span className="text-sm text-slate-900">{material.title}</span>
                        <span className="text-xs uppercase text-muted-foreground">{material.file_type || "dosya"}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-1">
            <div className="glass-panel rounded-[40px] p-8">
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
                    <span>Sertifika İlerlemesi</span>
                    <span>%{Math.min(Math.round(((activeParticipation.credit ?? 0) / activeThreshold) * 100), 100)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(Math.round(((activeParticipation.credit ?? 0) / activeThreshold) * 100), 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel flex flex-col items-center rounded-[40px] border-dashed border-white/10 p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground/30">
                <Award className="h-8 w-8" />
              </div>
              <h4 className="mb-2 text-sm font-bold">Sertifikalarım</h4>
              <p className="mb-6 text-[10px] uppercase tracking-widest text-muted-foreground">Sertifika listesi için ayrı öğrenci endpointi henüz görünmüyor.</p>
              <button disabled className="w-full cursor-not-allowed rounded-xl bg-white/5 py-3 text-[10px] font-black uppercase tracking-widest opacity-50">
                Henüz Hazır Değil
              </button>
            </div>

            <div className="glass-panel rounded-[40px] p-8">
              <h3 className="mb-4 text-lg font-bold text-slate-900">Yaklaşan Teslim</h3>
              {assignments.find((assignment) => (assignment.submissions?.length ?? 0) === 0 && assignment.due_date) ? (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="font-bold text-slate-900">
                    {assignments.find((assignment) => (assignment.submissions?.length ?? 0) === 0 && assignment.due_date)?.title}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    {new Date(
                      assignments.find((assignment) => (assignment.submissions?.length ?? 0) === 0 && assignment.due_date)?.due_date || ""
                    ).toLocaleDateString("tr-TR")}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Bekleyen teslim tarihi olan ödev görünmüyor.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
