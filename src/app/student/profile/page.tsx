"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BrainCircuit, CheckCircle, Loader2, Lock, Save, UserCircle } from "lucide-react";
import api from "@/lib/api/axios";
import { useAuth } from "@/store/useAuth";

interface ProfileForm {
  phone: string;
  address: string;
  birth_date: string;
  university: string;
  department: string;
  class_year: string;
  hometown: string;
  motivation_message: string;
  linkedin_url: string;
  github_url: string;
  instagram_url: string;
}

interface PasswordForm {
  current_password: string;
  password: string;
  password_confirmation: string;
}

interface VerificationState {
  tc: boolean;
  yok: boolean;
}

const emptyProfile: ProfileForm = {
  phone: "",
  address: "",
  birth_date: "",
  university: "",
  department: "",
  class_year: "",
  hometown: "",
  motivation_message: "",
  linkedin_url: "",
  github_url: "",
  instagram_url: "",
};

const emptyPassword: PasswordForm = {
  current_password: "",
  password: "",
  password_confirmation: "",
};

export default function StudentProfilePage() {
  const { user, fetchProfile } = useAuth();
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPassword);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [verification, setVerification] = useState<VerificationState>({ tc: false, yok: false });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get("/user/profile");
        const nextUser = response.data.user;
        setVerification({
          tc: Boolean(nextUser.tc_verified),
          yok: Boolean(nextUser.yok_verified),
        });
        setForm({
          phone: nextUser.phone ?? "",
          address: nextUser.address ?? "",
          birth_date: nextUser.birth_date ?? "",
          university: nextUser.university ?? "",
          department: nextUser.department ?? "",
          class_year: nextUser.class_year ?? "",
          hometown: nextUser.hometown ?? "",
          motivation_message: nextUser.profile?.motivation_message ?? "",
          linkedin_url: nextUser.profile?.linkedin_url ?? "",
          github_url: nextUser.profile?.github_url ?? "",
          instagram_url: nextUser.profile?.instagram_url ?? "",
        });
      } catch (error) {
        console.error("Profil bilgileri yuklenemedi", error);
        setProfileMessage("Profil bilgileri yuklenirken bir hata olustu.");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage("");

    try {
      await api.put("/user/profile", form);
      await fetchProfile();
      setProfileMessage("Profil bilgileri basariyla guncellendi.");
    } catch (error) {
      console.error("Profil kaydedilemedi", error);
      setProfileMessage("Profil kaydedilirken bir hata olustu.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordMessage("");

    try {
      await api.post("/user/change-password", passwordForm);
      setPasswordForm(emptyPassword);
      setPasswordMessage("Sifreniz basariyla guncellendi.");
    } catch (error) {
      console.error("Sifre degistirilemedi", error);
      setPasswordMessage("Sifre degistirilirken bir hata olustu.");
    } finally {
      setSavingPassword(false);
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
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <UserCircle className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Profilim</h1>
          <p className="text-sm text-muted-foreground">Kisisel ve akademik bilgilerini bu ekrandan guncelleyebilirsin.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <form onSubmit={handleProfileSubmit} className="xl:col-span-2">
          <div className="glass-panel space-y-6 rounded-[32px] p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Temel Bilgiler</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Hesap sahibi: {user?.name} {user?.surname} ({user?.email})
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <VerificationPill label="TC" verified={verification.tc} />
                <VerificationPill label="YOK" verified={verification.yok} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary" placeholder="Telefon" />
              <input value={form.birth_date} onChange={(e) => setForm((prev) => ({ ...prev, birth_date: e.target.value }))} type="date" className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary" />
              <input value={form.university} onChange={(e) => setForm((prev) => ({ ...prev, university: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary" placeholder="Universite" />
              <input value={form.department} onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary" placeholder="Bolum" />
              <input value={form.class_year} onChange={(e) => setForm((prev) => ({ ...prev, class_year: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary" placeholder="Sinif / mezuniyet yili" />
              <input value={form.hometown} onChange={(e) => setForm((prev) => ({ ...prev, hometown: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary" placeholder="Memleket" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <LockedVerificationField
                label="T.C. Kimlik No"
                value={verification.tc ? "Sistemde dogrulandi" : "Dogrulama bekliyor"}
                verified={verification.tc}
              />
              <LockedVerificationField
                label="YOK Ogrenci Bilgisi"
                value={verification.yok ? "Sistemde dogrulandi" : "Dogrulama bekliyor"}
                verified={verification.yok}
              />
            </div>

            <textarea value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} className="min-h-[96px] w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary" placeholder="Adres" />
            <textarea value={form.motivation_message} onChange={(e) => setForm((prev) => ({ ...prev, motivation_message: e.target.value }))} className="min-h-[120px] w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary" placeholder="Kisa motivasyon notun" />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <input value={form.linkedin_url} onChange={(e) => setForm((prev) => ({ ...prev, linkedin_url: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary" placeholder="LinkedIn URL" />
              <input value={form.github_url} onChange={(e) => setForm((prev) => ({ ...prev, github_url: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary" placeholder="GitHub URL" />
              <input value={form.instagram_url} onChange={(e) => setForm((prev) => ({ ...prev, instagram_url: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary" placeholder="Instagram URL" />
            </div>

            {profileMessage && <p className="text-sm text-muted-foreground">{profileMessage}</p>}

            <button type="submit" disabled={savingProfile} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Profili Kaydet
            </button>
          </div>
        </form>

        <div className="space-y-8">
          <form onSubmit={handlePasswordSubmit}>
            <div className="glass-panel space-y-6 rounded-[32px] p-8">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Sifre Guncelle</h2>
              </div>

              <input
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
                className="w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary"
                placeholder="Mevcut sifre"
              />
              <input
                type="password"
                value={passwordForm.password}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary"
                placeholder="Yeni sifre"
              />
              <input
                type="password"
                value={passwordForm.password_confirmation}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, password_confirmation: e.target.value }))}
                className="w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-primary"
                placeholder="Yeni sifre tekrar"
              />

              {passwordMessage && <p className="text-sm text-muted-foreground">{passwordMessage}</p>}

              <button type="submit" disabled={savingPassword} className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 font-bold transition-colors hover:bg-muted">
                {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Sifreyi Guncelle
              </button>
            </div>
          </form>

          <div className="glass-panel space-y-6 rounded-[32px] p-8">
            <div className="flex items-center gap-3">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Kisilik Analizi</h2>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary">
                <BrainCircuit className="h-8 w-8" />
              </div>
              <h3 className="mb-2 font-bold text-slate-900">Analiz testini tamamla</h3>
              <p className="mb-6 text-xs text-muted-foreground">
                Kariyer planlamani desteklemek icin hazirlanan sorulari doldur. Sonuclarin ilgili uzmanlar tarafindan gorulebilir.
              </p>
              <Link href="/student/personality" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-slate-900 transition-all hover:bg-primary/90">
                Teste Git <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <p className="text-center text-[10px] text-muted-foreground">
              TC ve YOK dogrulama alanlari kullanici tarafinda degistirilemez. Bu alanlar sadece yetkili sistem dogrulamalariyla guncellenir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerificationPill({ label, verified }: { label: string; verified: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold ${verified ? "border-green-500/20 bg-green-500/10 text-green-600" : "border-amber-500/20 bg-amber-500/10 text-amber-600"}`}>
      {verified ? <CheckCircle className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
      {label} {verified ? "dogrulandi" : "bekliyor"}
    </div>
  );
}

function LockedVerificationField({ label, value, verified }: { label: string; value: string; verified: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="font-semibold text-slate-900">{value}</div>
      <div className={`mt-2 text-xs font-semibold ${verified ? "text-green-600" : "text-amber-600"}`}>
        {verified ? "Bu alan kullanici tarafindan degistirilemez." : "Entegrasyon tamamlandiginda sistem tarafindan dogrulanacak."}
      </div>
    </div>
  );
}
