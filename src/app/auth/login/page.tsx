"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Fingerprint, ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api, { getCsrfCookie } from "@/lib/api/axios";
import { homePathForUser } from "@/lib/role-home";
import { useAuth } from "@/store/useAuth";

function formatAuthErrorMessage(
  data: { message?: string; errors?: Record<string, string[] | string> } | undefined,
  fallback: string,
): string {
  if (!data) {
    return fallback;
  }
  if (data.message && String(data.message).trim()) {
    return String(data.message);
  }
  if (data.errors && typeof data.errors === "object") {
    const parts = Object.values(data.errors)
      .flatMap((v) => (Array.isArray(v) ? v : [v]))
      .filter((v) => v != null && String(v).trim() !== "");
    if (parts.length) {
      return parts.map(String).join(" ");
    }
  }
  return fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await getCsrfCookie();
      const emailNorm = email.trim().toLowerCase();
      const response = await api.post("/auth/login", { email: emailNorm, password });

      setAuth(response.data.user, response.data.access_token);

      router.replace(homePathForUser(response.data.user));
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        console.error("Giriş Hatası Detayı:", err.response?.data);
        const data = err.response?.data as
          | { message?: string; must_change_password?: boolean; errors?: Record<string, string[] | string> }
          | undefined;
        if (err.response?.status === 403 && data?.must_change_password) {
          setError(
            data.message ??
              "Önce e-postanızdaki bağlantı ile şifrenizi belirlemeniz gerekiyor. Gerekirse «Şifremi unuttum» ile yeni bağlantı isteyin.",
          );
        } else {
          setError(formatAuthErrorMessage(data, "Giriş yapılamadı. Bilgilerinizi kontrol edin."));
        }
      } else {
        console.error("Giriş Hatası:", err);
        setError("Giriş yapılamadı. Bilgilerinizi kontrol edin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="absolute top-0 right-0 -z-10 h-full w-1/2 bg-gradient-to-l from-primary/10 to-transparent" />
      <div className="absolute -bottom-32 -left-32 -z-10 h-[500px] w-[500px] animate-pulse rounded-full bg-accent/20 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="glass-panel relative overflow-hidden rounded-3xl p-8 md:p-12">
          <div className="absolute top-0 left-1/2 h-1 w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary to-transparent" />

          <div className="mb-10 text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]">
              <Fingerprint className="h-8 w-8" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">KADEME Portal</h2>
            <p className="mt-2 text-muted-foreground">Sisteme giriş yapmak için bilgilerinizi girin.</p>
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

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="ml-1 text-sm font-medium text-foreground">E-Posta Adresi</label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input py-3 pr-4 pl-12 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                  placeholder="isim@ornek.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="ml-1 flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Parola</label>
                <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                  Şifremi unuttum
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input py-3 pr-4 pl-12 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                />
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
                  Sisteme Giriş Yap
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Hesabınız yok mu?{" "}
            <Link href="/auth/register" className="font-medium text-primary hover:underline">
              Hemen Başvurun
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
