"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, User, Mail, Lock, Phone } from "lucide-react";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background py-20">
      <div className="absolute top-0 right-0 -z-10 h-full w-1/2 bg-gradient-to-l from-primary/10 to-transparent" />
      <div className="absolute -bottom-32 -left-32 -z-10 h-[500px] w-[500px] animate-pulse rounded-full bg-accent/20 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-xl px-4"
      >
        <div className="glass-panel relative overflow-hidden rounded-3xl p-8 md:p-12">
          <div className="absolute top-0 left-1/2 h-1 w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary to-transparent" />

          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Hesap Oluştur</h2>
            <p className="mt-2 text-muted-foreground">KADEME sistemine dahil olmak için formu doldurun.</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 rounded-lg border border-destructive/50 bg-destructive/20 p-4 text-sm text-destructive-foreground"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="ml-1 text-sm font-medium text-foreground">Adınız</label>
                <div className="relative">
                  <User className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-input py-3 pr-4 pl-12 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                    placeholder="Adınız"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="ml-1 text-sm font-medium text-foreground">Soyadınız</label>
                <div className="relative">
                  <User className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    name="surname"
                    required
                    value={formData.surname}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-input py-3 pr-4 pl-12 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                    placeholder="Soyadınız"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-sm font-medium text-foreground">E-Posta Adresi</label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-border bg-input py-3 pr-4 pl-12 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                  placeholder="isim@ornek.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-sm font-medium text-foreground">Telefon</label>
              <div className="relative">
                <Phone className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-border bg-input py-3 pr-4 pl-12 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                  placeholder="05XX XXX XX XX"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="ml-1 text-sm font-medium text-foreground">Parola</label>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-input py-3 pr-4 pl-12 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="ml-1 text-sm font-medium text-foreground">Parola Doğrula</label>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    name="password_confirmation"
                    required
                    value={formData.password_confirmation}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-input py-3 pr-4 pl-12 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-semibold text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Hesabımı Oluştur
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Zaten hesabınız var mı?{" "}
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              Giriş Yapın
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
