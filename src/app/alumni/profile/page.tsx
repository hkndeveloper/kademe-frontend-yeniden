"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle, Loader2, Lock, Save, UserCircle } from "lucide-react";
import api from "@/lib/api/axios";
import { useAuth } from "@/store/useAuth";

interface ProfileForm {
  phone: string;
  address: string;
  birth_date: string;
  hometown: string;
  university: string;
  department: string;
  linkedin_url: string;
  github_url: string;
  instagram_url: string;
  motivation_message: string;
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
  hometown: "",
  university: "",
  department: "",
  linkedin_url: "",
  github_url: "",
  instagram_url: "",
  motivation_message: "",
};

const emptyPassword: PasswordForm = {
  current_password: "",
  password: "",
  password_confirmation: "",
};

export default function AlumniProfilePage() {
  const { user, fetchProfile } = useAuth();
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPassword);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
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
          hometown: nextUser.hometown ?? "",
          university: nextUser.university ?? "",
          department: nextUser.department ?? "",
          linkedin_url: nextUser.profile?.linkedin_url ?? "",
          github_url: nextUser.profile?.github_url ?? "",
          instagram_url: nextUser.profile?.instagram_url ?? "",
          motivation_message: nextUser.profile?.motivation_message ?? "",
        });
      } catch (error) {
        console.error("Alumni profile yuklenemedi", error);
        setMessage("Profil bilgileri yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setMessage("");

    try {
      await api.put("/user/profile", form);
      await fetchProfile();
      setMessage("Profil bilgileri guncellendi.");
    } catch (error) {
      console.error("Alumni profile kaydedilemedi", error);
      setMessage("Profil bilgileri kaydedilemedi.");
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
      setPasswordMessage("Sifre guncellendi.");
    } catch (error) {
      console.error("Alumni sifre guncellenemedi", error);
      setPasswordMessage("Sifre guncellenemedi.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400">
          <UserCircle className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900">Profilim</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Mezun profil bilgileri ve sifre yonetimi
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <form onSubmit={handleProfileSubmit} className="xl:col-span-2">
          <div className="glass-panel space-y-6 rounded-3xl p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Iletisim ve Kariyer Bilgileri</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {user?.name} {user?.surname} ({user?.email})
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <VerificationPill label="TC" verified={verification.tc} />
                <VerificationPill label="YOK" verified={verification.yok} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-purple-500" placeholder="Telefon" />
              <input value={form.birth_date} onChange={(e) => setForm((prev) => ({ ...prev, birth_date: e.target.value }))} type="date" className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-purple-500" />
              <input value={form.hometown} onChange={(e) => setForm((prev) => ({ ...prev, hometown: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-purple-500" placeholder="Sehir" />
              <input value={form.university} onChange={(e) => setForm((prev) => ({ ...prev, university: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-purple-500" placeholder="Universite" />
              <input value={form.department} onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-purple-500" placeholder="Bolum" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <LockedVerificationField
                label="T.C. Kimlik No"
                value={verification.tc ? "Sistemde dogrulandi" : "Dogrulama bekliyor"}
                verified={verification.tc}
              />
              <LockedVerificationField
                label="YOK Mezun Bilgisi"
                value={verification.yok ? "Sistemde dogrulandi" : "Dogrulama bekliyor"}
                verified={verification.yok}
              />
            </div>

            <textarea value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} className="min-h-[96px] w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-purple-500" placeholder="Adres" />
            <textarea value={form.motivation_message} onChange={(e) => setForm((prev) => ({ ...prev, motivation_message: e.target.value }))} className="min-h-[120px] w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-purple-500" placeholder="Kisa kariyer ozeti" />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <input value={form.linkedin_url} onChange={(e) => setForm((prev) => ({ ...prev, linkedin_url: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-purple-500" placeholder="LinkedIn URL" />
              <input value={form.github_url} onChange={(e) => setForm((prev) => ({ ...prev, github_url: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-purple-500" placeholder="GitHub URL" />
              <input value={form.instagram_url} onChange={(e) => setForm((prev) => ({ ...prev, instagram_url: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-purple-500" placeholder="Instagram URL" />
            </div>

            {message && <p className="text-sm text-muted-foreground">{message}</p>}

            <button type="submit" disabled={savingProfile} className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-bold text-white">
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Profili Kaydet
            </button>
          </div>
        </form>

        <form onSubmit={handlePasswordSubmit}>
          <div className="glass-panel space-y-6 rounded-3xl p-8">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-purple-400" />
              <h2 className="text-lg font-bold text-slate-900">Sifre Guncelle</h2>
            </div>

            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
              className="w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="Mevcut sifre"
            />
            <input
              type="password"
              value={passwordForm.password}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="Yeni sifre"
            />
            <input
              type="password"
              value={passwordForm.password_confirmation}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, password_confirmation: e.target.value }))}
              className="w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="Yeni sifre tekrar"
            />

            {passwordMessage && <p className="text-sm text-muted-foreground">{passwordMessage}</p>}

            <button type="submit" disabled={savingPassword} className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 font-bold transition-colors hover:bg-muted">
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Sifreyi Guncelle
            </button>
          </div>
        </form>
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
