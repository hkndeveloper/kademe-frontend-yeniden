"use client";

import { Suspense, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import api, { getCsrfCookie } from "@/lib/api/axios";

function ForgotPasswordInner() {
  const searchParams = useSearchParams();
  const setupNotice = searchParams.get("notice") === "setup";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await getCsrfCookie();
      const res = await api.post("/auth/forgot-password", { email: email.trim() });
      setMessage(res.data?.message ?? "Islem tamamlandi.");
    } catch (err) {
      if (isAxiosError(err)) {
        setError((err.response?.data as { message?: string })?.message ?? "Islem basarisiz.");
      } else {
        setError("Islem basarisiz.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl"
    >
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Sifre belirleme baglantisi</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Hesabiniza kayitli e-postayi girin. Size sifre belirleme linki gonderelim.
      </p>

      {setupNotice ? (
        <div className="mt-4 rounded-xl border border-amber-300/50 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100">
          Hesabinizi yonetici actiysa once e-postanizdaki baglantiyi kullanin. Gelmediyse asagidan adresinizi yazip yeni baglanti
          isteyin; sifre belirlemeden panele erisemezsiniz.
        </div>
      ) : null}

      {message ? (
        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      ) : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
        <div>
          <label className="ml-1 text-sm font-medium">E-posta</label>
          <div className="relative mt-1">
            <Mail className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-input py-3 pr-4 pl-11 outline-none focus:ring-2 focus:ring-primary"
              placeholder="isim@ornek.com"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Baglanti gonder
        </button>
      </form>

      <Link href="/auth/login" className="mt-6 inline-flex items-center gap-2 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Girise don
      </Link>
    </motion.div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" /> Yukleniyor...
          </div>
        }
      >
        <ForgotPasswordInner />
      </Suspense>
    </div>
  );
}
