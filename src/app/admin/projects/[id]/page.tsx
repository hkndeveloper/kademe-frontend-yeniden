"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Sparkles,
  Users,
} from "lucide-react";
import api from "@/lib/api/axios";
import { usePermissions } from "@/hooks/usePermissions";

interface ActivePeriod {
  id: number;
  name: string;
}

interface Alumni {
  id: number;
  year: string;
  name: string;
  university: string;
  job?: string;
  image?: string;
}

interface ActiveStudent {
  id: number;
  name: string;
  university?: string | null;
  department?: string | null;
  image?: string | null;
}

interface ProjectDetail {
  id: number;
  name: string;
  slug: string;
  type: string;
  description: string;
  short_description: string;
  cover_image: string | null;
  status: string;
  is_application_open: boolean;
  has_interview?: boolean;
  quota?: number | null;
  active_period: ActivePeriod | null;
  next_application_date?: string | null;
  gallery?: string[];
  active_students?: ActiveStudent[];
  alumni?: Alumni[];
}

export default function AdminProjectDashboard() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { canAccessProject } = usePermissions();
  const projectIdNum = params.id ? Number(params.id) : NaN;
  const canEditContent = Number.isFinite(projectIdNum) && canAccessProject("projects.content.update", projectIdNum);

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        // 1. Önce Adminin yönetebileceği projelerden bu projenin slug'ını bul
        const manageableRes = await api.get<{ data?: ProjectDetail[], projects?: ProjectDetail[] }>("/admin/projects/manageable");
        const projectsList = manageableRes.data.projects || manageableRes.data.data || [];
        const targetProject = projectsList.find((p: any) => p.id === Number(params.id));

        if (!targetProject) {
          setError("Proje bulunamadı veya yetkiniz yok.");
          setLoading(false);
          return;
        }

        // 2. Slug ile tüm katılımcı ve galeri detaylarını getir (Public endpointte zaten her şey var)
        const response = await api.get<{ project: ProjectDetail }>(`/projects/${targetProject.slug}`);
        setProject(response.data.project);
      } catch (err) {
        console.error("Proje detayları çekilemedi", err);
        setError("Proje detayları yüklenirken hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      void fetchProjectDetails();
    }
  }, [params.id]);

  const groupedAlumni = useMemo(() => {
    return (project?.alumni ?? []).reduce((acc, curr) => {
      (acc[curr.year] = acc[curr.year] || []).push(curr);
      return acc;
    }, {} as Record<string, Alumni[]>);
  }, [project?.alumni]);

  const activeStudents = project?.active_students ?? [];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center text-red-200">
        <p>{error || "Proje yüklenemedi."}</p>
        <button onClick={() => router.push("/admin/projects")} className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">
          Projelere Dön
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <button onClick={() => router.push("/admin/projects")} className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Tüm Projelere Dön
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900">{project.name}</h1>
            <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
              {project.type || "PROJE"}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Bu sayfa üzerinden projeye ait detayları, aktif öğrenci sayısını, mezun görsellerini ve galeri görüntülerini analiz edebilirsiniz.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canEditContent ? (
            <Link href={`/admin/projects/${params.id}/content`} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white transition-colors hover:bg-indigo-700">
              <Pencil className="h-4 w-4" />
              İçeriği Düzenle
            </Link>
          ) : (
            <Link
              href={`/admin/projects/${params.id}/content`}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-bold text-muted-foreground transition-colors hover:bg-white/10 hover:text-slate-900"
            >
              <Pencil className="h-4 w-4" />
              İçeriği Görüntüle
            </Link>
          )}
        </div>
      </div>

      {/* DASHBOARD İSTATİSTİKLERİ */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="glass-panel rounded-3xl p-6 border-l-4 border-indigo-500">
          <div className="flex items-center gap-3 text-indigo-400 mb-2">
            <Users className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Aktif Öğrenciler</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{activeStudents.length}</div>
        </div>
        <div className="glass-panel rounded-3xl p-6 border-l-4 border-emerald-500">
          <div className="flex items-center gap-3 text-emerald-400 mb-2">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Mezunlar</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{project.alumni?.length || 0}</div>
        </div>
        <div className="glass-panel rounded-3xl p-6 border-l-4 border-amber-500">
          <div className="flex items-center gap-3 text-amber-400 mb-2">
            <ImageIcon className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Galeri Görseli</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{project.gallery?.length || 0}</div>
        </div>
        <div className="glass-panel rounded-3xl p-6 border-l-4 border-primary">
          <div className="flex items-center gap-3 text-primary mb-2">
            <Calendar className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Başvuru Durumu</span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {project.is_application_open ? "Açık" : "Kapalı"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="space-y-8">
          {/* PROJE DETAYLARI */}
          <div className="glass-panel rounded-3xl p-8">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
              <Sparkles className="h-5 w-5 text-primary" />
              Proje Detay Bilgileri
            </h2>
            <div className="space-y-4">
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Kısa Açıklama</p>
                <p className="mt-2 text-sm text-slate-900">{project.short_description || "Kısa açıklama bulunmuyor."}</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aktif Dönem</p>
                <p className="mt-2 text-sm text-slate-900">{project.active_period?.name || "Aktif bir dönem tanımlanmamış."}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Kontenjan</p>
                  <p className="mt-2 text-sm text-slate-900">{project.quota ? `${project.quota} Kişi` : "Sınırsız / Belirtilmemiş"}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mülakat Akışı</p>
                  <p className="mt-2 text-sm text-slate-900">{project.has_interview ? "Mülakatlı Değerlendirme" : "Mülakatsız Akış"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* GALERİ */}
          <div className="glass-panel rounded-3xl p-8">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
              <ImageIcon className="h-5 w-5 text-primary" />
              Projelerden Görüntüler / Galeri
            </h2>
            {project.gallery && project.gallery.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {project.gallery.map((img, index) => (
                  <div key={`${img}-${index}`} className="relative h-32 overflow-hidden rounded-xl bg-muted/30 group">
                    <Image src={img} alt={`Galeri ${index + 1}`} fill unoptimized className="object-cover transition-transform group-hover:scale-110" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-muted-foreground">
                <ImageIcon className="mx-auto mb-2 h-8 w-8 opacity-20" />
                Bu proje için henüz galeri görseli eklenmemiş. <br />
                {canEditContent ? (
                  <Link href={`/admin/projects/${params.id}/content`} className="mt-2 inline-block text-primary hover:underline">
                    İçerik düzenleyiciden ekle
                  </Link>
                ) : (
                  <span className="mt-2 inline-block text-sm text-muted-foreground">Galeri eklemek için proje içeriği güncelleme yetkisi gerekir.</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* AKTİF ÖĞRENCİLER */}
          <div className="glass-panel rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Users className="h-5 w-5 text-primary" />
                Proje Öğrenci Görselleri (Aktif)
              </h2>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-900">{activeStudents.length}</span>
            </div>
            {activeStudents.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {activeStudents.slice(0, 6).map((student) => (
                  <div key={`active-${student.id}`} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                      {student.image ? <Image src={student.image} alt={student.name} fill unoptimized className="object-cover" /> : null}
                    </div>
                    <div className="overflow-hidden">
                      <p className="truncate text-sm font-bold text-slate-900">{student.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{student.university || "Üniversite yok"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-muted-foreground">
                Aktif öğrenci bulunmuyor.
              </div>
            )}
            {activeStudents.length > 6 && (
              <div className="mt-4 text-center">
                <span className="text-xs text-muted-foreground">+{activeStudents.length - 6} öğrenci daha var</span>
              </div>
            )}
          </div>

          {/* MEZUNLAR YIL YIL */}
          <div className="glass-panel rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Mezun Öğrenci Görselleri (Yıl-Yıl)
              </h2>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-900">{project.alumni?.length || 0}</span>
            </div>
            
            {Object.keys(groupedAlumni).length > 0 ? (
              <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(groupedAlumni)
                  .sort((a, b) => Number(b[0]) - Number(a[0]))
                  .map(([year, students]) => (
                    <div key={year} className="relative">
                      <div className="sticky top-0 z-10 mb-3 rounded-lg bg-black/60 px-3 py-1 backdrop-blur-md inline-block border border-white/10">
                        <span className="text-xs font-black tracking-widest text-primary">{year} MEZUNLARI</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {students.map((student) => (
                          <div key={`alumni-${student.id}`} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                              {student.image ? <Image src={student.image} alt={student.name} fill unoptimized className="object-cover" /> : null}
                            </div>
                            <div className="overflow-hidden">
                              <p className="truncate text-sm font-bold text-slate-900">{student.name}</p>
                              <p className="truncate text-[10px] text-muted-foreground">{student.university}</p>
                              {student.job ? <p className="truncate text-[9px] text-emerald-400">{student.job}</p> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-muted-foreground">
                Bu projeye ait mezun kaydı bulunmuyor.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
