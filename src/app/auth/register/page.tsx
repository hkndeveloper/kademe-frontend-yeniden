"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Lock, Mail, Phone, ShieldCheck, User } from "lucide-react";
import { isAxiosError } from "axios";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicBadge, PublicButton, PublicCard, PublicGradientTitle, PublicIconBadge } from "@/components/public";
import api, { getCsrfCookie } from "@/lib/api/axios";

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.password_confirmation) {
      setError("Şifreler eşleşmiyor.");
      setLoading(false);
      return;
    }

    try {
      await getCsrfCookie();
      await api.post("/auth/register", formData);
      router.push("/auth/login?registered=true");
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Kayıt işlemi başarısız. Lütfen bilgilerinizi kontrol edin.");
      } else {
        setError("Kayıt işlemi başarısız. Lütfen bilgilerinizi kontrol edin.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "h-14 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100";
  const labelClass = "text-xs font-black uppercase tracking-[0.14em] text-slate-500";

  return (
    <main className="kdm-public-shell relative min-h-screen bg-[#edecec] pb-16">
      <div className="px-4 pt-4 sm:px-6 lg:px-10">
      <section className="relative isolate overflow-hidden rounded-[2rem] pb-10 pt-36 sm:pt-40 lg:pt-44">
        <div className="absolute inset-0 -z-10 overflow-hidden bg-[#e7e7e4]">
          <Image src="/aigocy/images/section/hero-1.jpg" alt="" fill priority className="object-cover opacity-55" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.92),transparent_20rem),radial-gradient(circle_at_82%_18%,rgba(253,58,37,0.15),transparent_17rem),linear-gradient(180deg,rgba(255,255,255,0.4),rgba(231,231,228,0.9))]" />
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6">
          <div className="grid min-h-[calc(100dvh-12rem)] items-center gap-8 lg:grid-cols-[0.88fr_1.12fr]">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="hidden lg:block">
              <PublicBadge className="mb-6 border-white/80 bg-white/90 text-[#fd3a25] shadow-[0_4px_12px_rgba(9,9,11,0.10)]">Yeni Başvuru</PublicBadge>
              <h1 className="max-w-xl text-balance text-6xl font-semibold leading-[0.95] tracking-normal text-[#2f3437]">
                <PublicGradientTitle>KADEME Sistemine Katılın</PublicGradientTitle>
              </h1>
              <p className="mt-7 max-w-md text-base leading-8 text-[#3f4653]">
                Hesap oluşturduktan sonra başvuru ve gelişim süreçlerinizi tek merkezden takip edebilirsiniz.
              </p>
              <div className="mt-8 grid max-w-md gap-3">
                {['Başvuru takibi', 'Program bildirimleri', 'Kişisel gelişim kayıtları'].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-full border border-white/80 bg-white/80 px-5 py-3 text-sm font-bold text-slate-700 shadow-sm backdrop-blur">
                    <ShieldCheck className="h-4 w-4 text-[#fd3a25]" />
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }}>
              <PublicCard className="mx-auto w-full max-w-2xl p-6 sm:p-8 lg:p-10">
                <div className="mb-8 text-center">
                  <PublicIconBadge className="mx-auto mb-5 h-16 w-16 bg-orange-600">
                    <User className="h-8 w-8" />
                  </PublicIconBadge>
                  <h2 className="text-3xl font-black tracking-tight text-slate-950">Hesap Oluştur</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">KADEME sistemine dahil olmak için formu doldurun.</p>
                </div>

                {error ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-7 text-red-800">
                    {error}
                  </motion.div>
                ) : null}

                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className={labelClass}>Adınız</span>
                      <span className="relative block">
                        <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input type="text" name="name" required value={formData.name} onChange={handleChange} className={inputClass} placeholder="Adınız" />
                      </span>
                    </label>

                    <label className="block space-y-2">
                      <span className={labelClass}>Soyadınız</span>
                      <span className="relative block">
                        <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input type="text" name="surname" required value={formData.surname} onChange={handleChange} className={inputClass} placeholder="Soyadınız" />
                      </span>
                    </label>
                  </div>

                  <label className="block space-y-2">
                    <span className={labelClass}>E-posta Adresi</span>
                    <span className="relative block">
                      <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input type="email" name="email" required value={formData.email} onChange={handleChange} className={inputClass} placeholder="isim@ornek.com" />
                    </span>
                  </label>

                  <label className="block space-y-2">
                    <span className={labelClass}>Telefon</span>
                    <span className="relative block">
                      <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className={inputClass} placeholder="05XX XXX XX XX" />
                    </span>
                  </label>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className={labelClass}>Parola</span>
                      <span className="relative block">
                        <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input type="password" name="password" required value={formData.password} onChange={handleChange} className={inputClass} placeholder="********" />
                      </span>
                    </label>

                    <label className="block space-y-2">
                      <span className={labelClass}>Parola Doğrula</span>
                      <span className="relative block">
                        <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input type="password" name="password_confirmation" required value={formData.password_confirmation} onChange={handleChange} className={inputClass} placeholder="********" />
                      </span>
                    </label>
                  </div>

                  <PublicButton type="submit" disabled={loading} variant="dark" size="lg" className="w-full" icon={loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}>
                    Hesabımı Oluştur
                  </PublicButton>
                </form>

                <div className="mt-8 rounded-2xl bg-slate-50 p-4 text-center text-sm font-semibold text-slate-600">
                  Zaten hesabınız var mı?{' '}
                  <Link href="/auth/login" className="font-black text-orange-700 hover:underline">
                    Giriş Yapın
                  </Link>
                </div>
              </PublicCard>
            </motion.div>
          </div>
        </div>
      </section>
      </div>
    </main>
  );
}