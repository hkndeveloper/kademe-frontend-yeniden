"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
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
      setMessage("Gecersiz baglanti. E-posta ve token parametreleri gerekli.");
      return;
    }

    setStatus("loading");

    api
      .get<{ message?: string }>("/newsletter/unsubscribe", {
        params: { email, token },
      })
      .then((res) => {
        setStatus("done");
        setMessage(res.data.message ?? "Islem tamamlandi.");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Abonelik iptali sirasinda bir hata olustu veya baglanti gecersiz.");
      });
  }, [searchParams]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="mb-4 text-2xl font-black text-slate-900">E-bulten Aboneligi</h1>
      {status === "loading" ? (
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Isleniyor...</span>
        </div>
      ) : (
        <p
          className={`rounded-2xl border px-4 py-3 text-sm ${
            status === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {message}
        </p>
      )}
      <Link href="/" className="mt-8 text-sm font-bold text-primary hover:underline">
        Anasayfaya don
      </Link>
    </div>
  );
}

export default function NewsletterUnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <NewsletterUnsubscribeInner />
    </Suspense>
  );
}
