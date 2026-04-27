"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle, Loader2, Lock, Save, UserCircle, Calendar, Send } from "lucide-react";
import api from "@/lib/api/axios";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { useAuth } from "@/store/useAuth";

interface ProfileForm {
  phone: string;
  address: string;
  birth_date: string;
  hometown: string;
  university: string;
  department: string;
}

interface PasswordForm {
  current_password: string;
  password: string;
  password_confirmation: string;
}

interface LeaveRequest {
  id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  approver?: { name: string; surname: string };
}

const emptyProfile: ProfileForm = {
  phone: "",
  address: "",
  birth_date: "",
  hometown: "",
  university: "",
  department: "",
};

const emptyPassword: PasswordForm = {
  current_password: "",
  password: "",
  password_confirmation: "",
};

export default function StaffProfilePage() {
  const { user, fetchProfile, hasPermission } = useAuth();
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPassword);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveForm, setLeaveForm] = useState({ start_date: "", end_date: "", reason: "" });
  const [savingLeave, setSavingLeave] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState("");

  const loadLeaves = async () => {
    try {
      const response = await api.get("/my-leave-requests");
      setLeaves(response.data.leave_requests ?? []);
    } catch (error) {
      console.error("İzinler yüklenemedi", error);
    }
  };

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
        });
      } catch (error) {
        console.error("Staff profile yuklenemedi", error);
        setMessage("Profil bilgileri yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  useEffect(() => {
    if (hasPermission("staff.leave.request")) {
      void loadLeaves();
    }
  }, [hasPermission]);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setMessage("");

    try {
      await api.put("/user/profile", form);
      await fetchProfile();
      setMessage("Profil bilgileri guncellendi.");
    } catch (error) {
      console.error("Staff profile kaydedilemedi", error);
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
      console.error("Staff sifre guncellenemedi", error);
      setPasswordMessage("Sifre guncellenemedi.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLeaveSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingLeave(true);
    setLeaveMessage("");

    try {
      const response = await api.post("/leave-requests", leaveForm);
      setLeaves((prev) => [response.data.leave_request, ...prev]);
      setLeaveForm({ start_date: "", end_date: "", reason: "" });
      setLeaveMessage("İzin talebi oluşturuldu.");
    } catch (error) {
      console.error("İzin talebi oluşturulamadı", error);
      setLeaveMessage("İzin talebi oluşturulamadı. Tarihleri kontrol edin.");
    } finally {
      setSavingLeave(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500">
          <UserCircle className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900">Profilim</h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Staff rolu icin mevcut backend yuzeyine bagli profil ve sifre yonetimi
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <a 
          href="http://kademepuantaj.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors"
        >
          <Calendar className="h-5 w-5" />
          Aylık Puantaj Sistemi
        </a>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <form onSubmit={handleProfileSubmit} className="xl:col-span-2">
          <div className="glass-panel space-y-6 rounded-3xl p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Temel Bilgiler</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {user?.name} {user?.surname} ({user?.email})
                </p>
              </div>
              <div className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-green-500">
                <CheckCircle className="mr-1 inline h-3 w-3" />
                Hesap aktif
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-amber-500" placeholder="Telefon" />
              <input value={form.birth_date} onChange={(e) => setForm((prev) => ({ ...prev, birth_date: e.target.value }))} type="date" className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-amber-500" />
              <input value={form.department} onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-amber-500" placeholder="Birim" />
              <input value={form.hometown} onChange={(e) => setForm((prev) => ({ ...prev, hometown: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-amber-500" placeholder="Sehir" />
              <input value={form.university} onChange={(e) => setForm((prev) => ({ ...prev, university: e.target.value }))} className="rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-amber-500" placeholder="Universite" />
            </div>

            <textarea value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} className="min-h-[120px] w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-amber-500" placeholder="Adres" />

            {message && <p className="text-sm text-muted-foreground">{message}</p>}

            <button type="submit" disabled={savingProfile} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-white">
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Profili Kaydet
            </button>
          </div>
        </form>

        <form onSubmit={handlePasswordSubmit}>
          <div className="glass-panel space-y-6 rounded-3xl p-8">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900">Sifre Guncelle</h2>
            </div>

            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
              className="w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="Mevcut sifre"
            />
            <input
              type="password"
              value={passwordForm.password}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="Yeni sifre"
            />
            <input
              type="password"
              value={passwordForm.password_confirmation}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, password_confirmation: e.target.value }))}
              className="w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-amber-500"
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

      {/* LEAVE REQUESTS SECTION */}
      <PermissionGate
        permission="staff.leave.request"
        fallback={
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-6 py-6 text-sm text-amber-100">
            Izin talebi olusturma yetkiniz bulunmuyor.
          </div>
        }
      >
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <form onSubmit={handleLeaveSubmit} className="glass-panel space-y-6 rounded-3xl p-8 xl:col-span-1 h-max">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">İzin Talep Et</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Başlangıç</label>
              <input type="date" required value={leaveForm.start_date} onChange={(e) => setLeaveForm(prev => ({ ...prev, start_date: e.target.value }))} className="w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Bitiş</label>
              <input type="date" required value={leaveForm.end_date} onChange={(e) => setLeaveForm(prev => ({ ...prev, end_date: e.target.value }))} className="w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Gerekçe (İsteğe Bağlı)</label>
              <textarea value={leaveForm.reason} onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))} className="h-24 w-full rounded-xl border border-border bg-input p-4 outline-none focus:ring-1 focus:ring-amber-500" placeholder="İzin gerekçesi..." />
            </div>
          </div>
          {leaveMessage && <p className="text-sm text-amber-500">{leaveMessage}</p>}
          <button type="submit" disabled={savingLeave} className="inline-flex w-full justify-center items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-black transition-colors hover:bg-amber-400">
            {savingLeave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Talep Gönder
          </button>
        </form>

        <div className="glass-panel rounded-3xl p-8 xl:col-span-2">
          <h2 className="text-lg font-bold text-slate-900 mb-6">İzin Taleplerim</h2>
          {leaves.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-white/10 rounded-2xl">Geçmiş izin talebiniz bulunmuyor.</div>
          ) : (
            <div className="space-y-4">
              {leaves.map((leave) => (
                <div key={leave.id} className="flex flex-col md:flex-row md:items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4 gap-4">
                  <div>
                    <div className="font-bold text-slate-900">
                      {new Date(leave.start_date).toLocaleDateString('tr-TR')} - {new Date(leave.end_date).toLocaleDateString('tr-TR')}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 max-w-sm truncate" title={leave.reason || ''}>{leave.reason || 'Gerekçe belirtilmemiş'}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                      leave.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                      leave.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {leave.status === 'pending' ? 'Bekliyor' : leave.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                    </span>
                    {leave.approver && <div className="text-[10px] text-muted-foreground">İşlem: {leave.approver.name} {leave.approver.surname}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </PermissionGate>
    </div>
  );
}
