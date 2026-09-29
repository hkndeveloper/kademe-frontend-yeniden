import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import styles from "./SupportBanner.module.css";

export function SupportBanner({ title, description, label, href }: {
  title: string; description: string; label: string; href: string;
}) {
  return (
    <section className={styles.banner} aria-label="İletişim ve destek">
      <div className={styles.art}>
        <Image src="/images/support-conversation.svg" alt="" width={520} height={420} />
      </div>
      <div className={styles.copy}>
        <span className={styles.eyebrow}><MessageCircle size={15} /> BİRLİKTE BİR CEVAP BULALIM</span>
        <h2>{title}</h2>
        <p>{description}</p>
        <Link href={href || "/contact"} className={styles.action}>
          {label}<ArrowUpRight size={20} aria-hidden="true" />
        </Link>
      </div>
      <span className={styles.note}>KADEME / İLETİŞİM VE DESTEK</span>
    </section>
  );
}
