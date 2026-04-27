"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, User, GraduationCap, Briefcase, Link2, Loader2, Save } from "lucide-react";
import api from "@/lib/api/axios";
import { useAuth } from "@/store/useAuth";

interface CvForm {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  university: string;
  department: string;
  classYear: string;
  linkedin: string;
  github: string;
  instagram: string;
  experience: string;
  skills: string;
}

const emptyCv: CvForm = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  summary: "",
  university: "",
  department: "",
  classYear: "",
  linkedin: "",
  github: "",
  instagram: "",
  experience: "",
  skills: "",
};

export default function CvBuilderPage() {
  const { user, fetchProfile } = useAuth();
  const [form, setForm] = useState<CvForm>(emptyCv);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      void (async () => {
        try {
          await fetchProfile();
          const response = await api.get("/user/profile");
          const nextUser = response.data.user;

          setForm({
            fullName: `${nextUser.name ?? ""} ${nextUser.surname ?? ""}`.trim(),
            email: nextUser.email ?? "",
            phone: nextUser.phone ?? "",
            location: nextUser.hometown ?? "",
            summary: nextUser.profile?.motivation_message ?? "",
            university: nextUser.university ?? "",
            department: nextUser.department ?? "",
            classYear: nextUser.class_year ?? "",
            linkedin: nextUser.profile?.linkedin_url ?? "",
            github: nextUser.profile?.github_url ?? "",
            instagram: nextUser.profile?.instagram_url ?? "",
            experience: "",
            skills: "",
          });
        } catch (error) {
          console.error("CV verileri yuklenemedi", error);
          setMessage("Profil verileri yuklenemedi. CV formunu manuel doldurabilirsiniz.");
        } finally {
          setLoading(false);
        }
      })();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchProfile]);

  const skillsList = useMemo(
    () =>
      form.skills
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [form.skills]
  );

  const handleExport = () => {
    window.print();
  };

  const handleSaveProfileLinks = async () => {
    try {
      await api.put("/user/profile", {
        phone: form.phone,
        hometown: form.location,
        university: form.university,
        department: form.department,
        class_year: form.classYear,
        motivation_message: form.summary,
        linkedin_url: form.linkedin || null,
        github_url: form.github || null,
        instagram_url: form.instagram || null,
      });

      setMessage("CV alanlari profilinizle senkronize edildi.");
    } catch (error) {
      console.error("CV verileri profile kaydedilemedi", error);
      setMessage("CV verileri profile senkronize edilemedi.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 print:space-y-0 print:m-0 print:p-0">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <FileText className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Özgeçmiş Hazırla</h1>
            <p className="text-sm text-muted-foreground">Profil verilerinizle otomatik dolan bir CV taslağı oluşturun ve yazdırılabilir onizleme alın.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={() => void handleSaveProfileLinks()} className="flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold transition-colors hover:bg-muted">
            <Save className="h-4 w-4" />
            Profille Senkronize Et
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:opacity-90 transition">
            <Download className="h-5 w-5" />
            PDF Olarak İndir
          </button>
        </div>
      </div>

      {message && <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary print:hidden">{message}</div>}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 print:grid-cols-1 print:block print:w-full">
        <div className="space-y-6 print:hidden">
          <div className="glass-panel rounded-3xl p-8">
            <div className="mb-6 flex items-center gap-2 text-lg font-bold">
              <User className="h-5 w-5 text-primary" />
              Kişisel Bilgiler
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="Ad Soyad" />
              <input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="E-posta" />
              <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="Telefon" />
              <input value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="Şehir / memleket" />
            </div>
            <textarea value={form.summary} onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))} className="mt-4 min-h-[120px] w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="Kısa profil özetiniz" />
          </div>

          <div className="glass-panel rounded-3xl p-8">
            <div className="mb-6 flex items-center gap-2 text-lg font-bold">
              <GraduationCap className="h-5 w-5 text-primary" />
              Eğitim ve Bağlantılar
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input value={form.university} onChange={(e) => setForm((prev) => ({ ...prev, university: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="Üniversite" />
              <input value={form.department} onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="Bölüm" />
              <input value={form.classYear} onChange={(e) => setForm((prev) => ({ ...prev, classYear: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="Sınıf / mezuniyet yılı" />
              <input value={form.skills} onChange={(e) => setForm((prev) => ({ ...prev, skills: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="Yetkinlikler, virgül ile ayırın" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4">
              <input value={form.linkedin} onChange={(e) => setForm((prev) => ({ ...prev, linkedin: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="LinkedIn URL" />
              <input value={form.github} onChange={(e) => setForm((prev) => ({ ...prev, github: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="GitHub URL" />
              <input value={form.instagram} onChange={(e) => setForm((prev) => ({ ...prev, instagram: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="Instagram URL" />
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-8">
            <div className="mb-6 flex items-center gap-2 text-lg font-bold">
              <Briefcase className="h-5 w-5 text-primary" />
              Deneyim ve Notlar
            </div>
            <textarea value={form.experience} onChange={(e) => setForm((prev) => ({ ...prev, experience: e.target.value }))} className="min-h-[140px] w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="Stajlar, gönüllülük deneyimleri, kulüp görevleri veya proje deneyimleri" />
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel sticky top-24 rounded-3xl border-primary/20 bg-white p-8 text-black print:absolute print:top-0 print:left-0 print:w-[100%] print:min-h-screen print:border-none print:shadow-none print:bg-white">
          <div className="border-b border-black/10 pb-6">
            <h2 className="text-3xl font-black">{form.fullName || user?.name || "Ad Soyad"}</h2>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-black/70">
              {form.email && <span>{form.email}</span>}
              {form.phone && <span>{form.phone}</span>}
              {form.location && <span>{form.location}</span>}
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <section>
              <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-black/50">Profil</h3>
              <p className="text-sm leading-relaxed text-black/80">{form.summary || "Kısa bir profil özeti ekleyin."}</p>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-black/50">Eğitim</h3>
              <div className="text-sm leading-relaxed text-black/80">
                <div className="font-bold text-black">{form.university || "Üniversite bilgisi"}</div>
                <div>{form.department || "Bölüm bilgisi"}</div>
                <div>{form.classYear || "Sınıf / mezuniyet yılı"}</div>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-black/50">Deneyim</h3>
              <p className="text-sm leading-relaxed text-black/80">{form.experience || "Staj, gönüllülük veya proje deneyimi ekleyin."}</p>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-black/50">Yetkinlikler</h3>
              <div className="flex flex-wrap gap-2">
                {skillsList.length === 0 ? (
                  <span className="text-sm text-black/60">Virgülle ayırarak yetkinlik ekleyin.</span>
                ) : (
                  skillsList.map((skill) => (
                    <span key={skill} className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-black/70 print:border print:border-black/20">
                      {skill}
                    </span>
                  ))
                )}
              </div>
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black/50">
                <Link2 className="h-3.5 w-3.5" />
                Bağlantılar
              </h3>
              <div className="space-y-1 text-sm text-black/80">
                {form.linkedin && <div>{form.linkedin}</div>}
                {form.github && <div>{form.github}</div>}
                {form.instagram && <div>{form.instagram}</div>}
                {!form.linkedin && !form.github && !form.instagram && <div>Bağlantı eklenmedi.</div>}
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
