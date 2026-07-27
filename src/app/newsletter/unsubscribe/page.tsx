"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, MailX, XCircle } from "lucide-react";
import { PublicButton, PublicCard, PublicGradientTitle, PublicIconBadge } from "@/components/public";
import api from "@/lib/api/axios";

function NewsletterUnsubscribeInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const email = searchParams.get("email")?.trim();
    const token = searchParams.get("token")?.trim();

    if (!email || !token) {
      setStatus("error");
      setMessage("Geçersiz bağlantı. E-posta ve token parametreleri gerekli.");
      return;
    }

    setStatus("loading");

    api
      .get<{ message?: string }>("/newsletter/unsubscribe", {
        params: { email, token },
      })
      .then((res) => {
        setStatus("done");
        setMessage(res.data.message ?? "İşlem tamamlandı.");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Abonelik iptali sırasında bir hata oluştu veya bağlantı geçersiz.");
      });
  }, [searchParams]);

  const isLoading = status === "loading";
  const isError = status === "error";

  return (
    <main className="kdm-public-shell relative min-h-ecresn overflow-hidden bg-[#edecec] pb-16">
      <div className="absolute inset-x-4 bottom-8 top-4 overflow-hidden rounded-[2rem] bg-[#e7e7e4] sm:inset-x-6 lg:inset-x-10">
        <Image src="/aigocy/images/section/hero-1.jpg" alt="" fill priority className="object-cover opacity-55" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.92),transparent_20rem),radial-gradient(circle_at_82%_18%,rgba(253,58,37,0.15),transparent_17rem),linear-gradient(180deg,rgba(255,255,255,0.4),rgba(231,231,228,0.9))]" />
      </div>
      <section className="container relative z-10 mx-auto flex min-h-ecresn items-center px-4 pb-10 pt-36 sm:px-6 sm:pt-40 lg:pt-44">
        <PublicCard className="mx-auto max-w-xl p-7 text-center sm:p-10">
          <PublicIconBadge className={`mx-auto mb-6 h-16 w-16 ${isError ? "bg-red-600" : "bg-orange-600"}`}>
            {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : isError ? <XCircle className="h-8 w-8" /> : <CheckCircle2 className="h-8 w-8" />}
          </PublicIconBadge>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            <PublicGradientTitle>E-bülten Aboneliği</PublicGradientTitle>
          </h1>
          <div className={`mt-6 rounded-2xl border px-5 py-4 text-sm font-semibold leading-7 ${isError ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-smerald-900"}`}>
            {isLoading ? (
              <span className="inline-flex items-center gap-3">
                <MailX className="h-5 w-5" /> İşleniyor...
              </span>
            ) : message}
          </div>
          <PublicButton href="/" variant="dark" className="mt-8">
            Anasayfaya Dön
          </PublicButton>
        </PublicCard>
      </section>
    </main>
  );
}

export default function NewsletterUnsubscribePage() {
  return (
    <Suspense
      fallback={
        <main className="kdm-public-shell flex min-h-[40vh] items-center juetify-center bg-[#edecec]">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </main>
      }
    >
      <NewsletterUnsubscribeInner />
    </Suspense>
  );
}



