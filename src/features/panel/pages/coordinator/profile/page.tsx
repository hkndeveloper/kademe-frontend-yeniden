"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, Lock, Save, UserCircle } from "lucide-react";
import api from "@/lib/api/axios";
import { useAuth } from "@/store/useAuth";

interface ProfileForm {
  phone: string;
  address: string;
  birth_date: string;
  hometown: string;
  university: string;
  department: string;
  motivation_message: string;
}

interface PasswordForm {
  current_password: string;
  password: string;
  password_confirmation: string;
}

const emptyProfile: ProfileForm = {
  phone: "",
  address: "",
  birth_date: "",
  hometown: "",
  university: "",
  department: "",
  motivation_message: "",
};

const emptyPassword: PasswordForm = {
  current_password: "",
  password: "",
  password_confirmation: "",
};

export default function CoordinatorProfilePage() {
  const { user, fetchProfile } = useAuth();
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPassword);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get("/user/profile");
        const nextUser = response.data.user;
        setForm({
          phone: nextUser.phone ?? "",
          address: nextUser.address ?? "",
          birth_date: nextUser.birth_date ?? "",
          hometown: nextUser.hometown ?? "",
          university: nextUser.university ?? "",
          department: nextUser.department ?? "",
          motivation_message: nextUser.profile?.motivation_message ?? "",
        });
      } catch (error) {
        console.error("Koordinator profil bilgileri yuklenemedi", error);
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
      console.error("Koordinator profil guncellenemedi", error);
      setMessage("Profil bilgileri guncellenemedi.");
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
      console.error("Koordinator sifre guncellenemedi", error);
      setPasswordMessage("Sifre guncellenemedi.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent">
          <UserCircle className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900">Profilim</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Koordinator profil bilgileri ve sifre yonetimi
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-6 text-sm text-amber-200">
        Izin talebi, puantaj ve ozluk evraki icin ayri koordinator route seti gorunmuyor. Bu ekranda mevcut `/user/profile`
        ve `/user/change-password` akislari aktif olarak kullaniliyor.
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <form onSubmit={handleProfileSubmit} className="xl:col-span-2">
          <div className="glass-panel space-y-6 rounded-3xl p-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Temel Bilgiler</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {user?.name} {user?.surname} ({user?.email})
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent" placeholder="Telefon" />
              <input value={form.birth_date} onChange={(e) => setForm((prev) => ({ ...prev, birth_date: e.target.value }))} type="date" className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent" />
              <input value={form.department} onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent" placeholder="Birim" />
              <input value={form.hometown} onChange={(e) => setForm((prev) => ({ ...prev, hometown: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent" placeholder="Sehir" />
              <input value={form.university} onChange={(e) => setForm((prev) => ({ ...prev, university: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent" placeholder="Universite" />
            </div>

            <textarea value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} className="min-h-[100px] w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent" placeholder="Adres" />
            <textarea value={form.motivation_message} onChange={(e) => setForm((prev) => ({ ...prev, motivation_message: e.target.value }))} className="min-h-[120px] w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent" placeholder="Kisa not veya biyografi" />

            {message && <p className="text-sm text-muted-foreground">{message}</p>}

            <button type="submit" disabled={savingProfile} className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-bold text-accent-foreground">
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Profili Kaydet
            </button>
          </div>
        </form>

        <form onSubmit={handlePasswordSubmit}>
          <div className="glass-panel space-y-6 rounded-3xl p-8">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-bold text-slate-900">Sifre Guncelle</h2>
            </div>

            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
              className="w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent"
              placeholder="Mevcut sifre"
            />
            <input
              type="password"
              value={passwordForm.password}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent"
              placeholder="Yeni sifre"
            />
            <input
              type="password"
              value={passwordForm.password_confirmation}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, password_confirmation: e.target.value }))}
              className="w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-accent"
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
