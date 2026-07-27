import Image from "next/image";
import { WifiOff } from "lucide-react";
import { PublicButton, PublicCard, PublicGradientTitle, PublicIconBadge } from "@/components/public";

export default function OfflinePage() {
  return (
    <main className="kdm-public-shell relative min-h-screen overflow-hidden bg-[#edecec] pb-16">
      <div className="absolute inset-x-4 bottom-8 top-4 overflow-hidden rounded-[2rem] bg-[#e7e7e4] sm:inset-x-6 lg:inset-x-10">
        <Image src="/aigocy/images/section/hero-1.jpg" alt="" fill priority className="object-cover opacity-55" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.92),transparent_20rem),radial-gradient(circle_at_82%_18%,rgba(253,58,37,0.15),transparent_17rem),linear-gradient(180deg,rgba(255,255,255,0.4),rgba(231,231,228,0.9))]" />
      </div>
      <section className="container relative z-10 mx-auto flex min-h-screen items-center px-4 pb-10 pt-36 sm:px-6 sm:pt-40 lg:pt-44">
        <PublicCard className="mx-auto max-w-xl p-7 text-center sm:p-10">
          <PublicIconBadge className="mx-auto mb-6 h-16 w-16 bg-slate-950">
            <WifiOff className="h-8 w-8" />
          </PublicIconBadge>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            <PublicGradientTitle>Bağlantı Yok</PublicGradientTitle>
          </h1>
          <p className="mt-5 text-base leading-8 text-slate-600">
            İnternet bağlantısı geri geldiğinde sayfayı yenileyebilirsiniz.
          </p>
          <PublicButton href="/" variant="dark" className="mt-8">
            Anasayfaya Dön
          </PublicButton>
        </PublicCard>
      </section>
    </main>
  );
}