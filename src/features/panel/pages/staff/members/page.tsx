"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Phone, Search, ShieldCheck, Users } from "lucide-react";
import api from "@/lib/api/axios";
import { useAuth } from "@/store/useAuth";
import { ExportButtons } from "@/components/shared/ExportButtons";
import { PermissionGate } from "@/components/shared/PermissionGate";

interface StaffMember {
  id: number;
  name: string;
  surname: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  staff_profile?: {
    title?: string | null;
    unit?: string | null;
  } | null;
}

interface PaginatedMembers {
  data: StaffMember[];
}

export default function StaffMembersPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [unit, setUnit] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const response = await api.get<{ members: PaginatedMembers; unit?: string | null; message?: string }>("/panel/members");
        setMembers(response.data.members?.data ?? []);
        setUnit(response.data.unit ?? "");
        if (response.data.message) {
          setError(response.data.message);
        }
      } catch (requestError) {
        console.error("Staff uye listesi yuklenemedi", requestError);
        setError("Birim uye listesi su anda yuklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    void loadMembers();
  }, []);

  const filteredMembers = members.filter((member) => {
    const haystack = `${member.name} ${member.surname} ${member.email ?? ""} ${member.staff_profile?.title ?? ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Personel Listesi</h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">Kendi biriminize ait sade ekip gorunumu</p>
          </div>
        </div>
        <PermissionGate permission="staff.export">
          <ExportButtons endpoint="/panel/members/export" filename="birim_uyeleri" params={{ search: search || undefined }} buttonLabel="Uyeleri Disa Aktar" />
        </PermissionGate>
      </div>

      <PermissionGate
        permission="staff.view"
        fallback={
        <div className="glass-panel rounded-3xl p-10 text-center text-sm text-muted-foreground">
          Bu modulu goruntulemek icin yetkiniz bulunmuyor.
        </div>
        }
      >
      {
        <>
      <div className="glass-panel rounded-3xl p-8">
        <div className="space-y-5 text-sm text-muted-foreground">
          <p>Bu ekran artik sahte ekip kartlari yerine gercek birim listesine bagli calisiyor.</p>
          <p>
            Personel rolunde hassas ozluk verileri gosterilmiyor. Bu yuzey yalnizca ayni birimdeki ekip arkadaslarini ad, unvan ve
            temel iletisim ozeti ile sunuyor.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel rounded-3xl p-8">
          <div className="mb-4 flex items-center gap-2 text-amber-500">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="text-lg font-bold text-slate-900">Beklenen Veri Kapsami</h2>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">Birim bazli uye listesi</div>
            <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">Ad soyad, gorev, iletisim, aktif/pasif durumu</div>
            <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">Detayli ozluk verisi olmayan sade gorunum</div>
            <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">Yetki bazli sadece kendi birimine erisim</div>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Canli Birim Listesi</h2>
              <p className="text-sm text-muted-foreground">
                Hesap: {user?.name} {user?.surname} ({user?.role || "staff"})
              </p>
              <p className="text-sm text-amber-400">{unit ? `Birim: ${unit}` : "Birim bilgisi tanimli degil"}</p>
            </div>
            <label className="relative block md:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ad, e-posta veya unvan ara"
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-muted-foreground focus:border-amber-500/40"
              />
            </label>
          </div>

          {loading ? (
            <div className="flex min-h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : error && members.length === 0 ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{error}</div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-sm text-muted-foreground">Bu filtreye uygun ekip uyesi bulunmuyor.</div>
          ) : (
            <div className="space-y-3 text-sm text-muted-foreground">
              {filteredMembers.map((member) => (
                <div key={member.id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {member.name} {member.surname}
                        </h3>
                        <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {member.role}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{member.staff_profile?.title || "Unvan tanimli degil"}</p>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground md:text-right">
                      <div className="flex items-center gap-2 md:justify-end">
                        <Mail className="h-3.5 w-3.5 text-amber-500" />
                        <span>{member.email || "E-posta yok"}</span>
                      </div>
                      <div className="flex items-center gap-2 md:justify-end">
                        <Phone className="h-3.5 w-3.5 text-amber-500" />
                        <span>{member.phone || "Telefon yok"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
        </>
      }
      </PermissionGate>
    </div>
  );
}
