import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { SiteSettingsPayload } from "@/lib/site-config";
import styles from "./HomeEcosystem.module.css";

export function HomeEcosystem({ cards }: { cards: SiteSettingsPayload["homepage"]["intro_cards"] }) {
  return <div className={styles.layout}>
    <article className={styles.mentor} aria-labelledby="ecosystem-heading">
      <div className={styles.copy}>
        <div className={styles.eyebrow}><span /> KADEME EKOSİSTEMİ</div>
        <h3 id="ecosystem-heading">Merakınla başla.<br /><em>Geleceğini şekillendir.</em></h3>
        <Link href="/projects" className={styles.button}>Projeleri keşfet <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </div>
      <div className={styles.portrait}>
        <Image src="/images/kademe-owl.png" alt="Kehribar gözleri, fildişi yüzü ve bakır mekanik tüyleriyle KADEME rehber baykuşu" width={1254} height={1254} sizes="(min-width: 1024px) 44vw, 100vw" className={styles.owl} />
      </div>
      <div className={styles.signature}><span>MERAK · KEŞİF · GELİŞİM</span><span>KADEME ↗</span></div>
    </article>
    <div className={styles.cards}>
      {cards.map((card, index) => <Link key={`${card.title}-${index}`} href={card.cta_href} className={styles.card}>
        {card.image_url ? <div className={styles.thumbnail}><Image src={card.image_url} alt="" fill unoptimized sizes="(min-width: 1024px) 20vw, 100vw" className={styles.photo} /><span className={styles.number}>{String(index + 1).padStart(2, "0")}</span></div> : null}
        <div className={styles.details}><span className={styles.category}>GELİŞİM ALANI {String(index + 1).padStart(2, "0")}</span><h3>{card.title}</h3><p>{card.description}</p><span className={styles.cta}>{card.cta_label || "Keşfet"}<ArrowUpRight size={18} aria-hidden="true" /></span></div>
      </Link>)}
    </div>
  </div>;
}
