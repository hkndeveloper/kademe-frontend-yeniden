import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import styles from "./CertificateDesign.module.css";

export function CertificateBanner({ title, description, label, href }: {
  title: string; description: string; label: string; href: string;
}) {
  return (
    <section className={styles.bannerSection}>
      <div className="container mx-auto">
        <div className={styles.banner}>
          <div className={styles.bannerArt}>
            <Image src="/images/certificate-illustration.svg" alt="" width={520} height={420} />
          </div>
          <div className={styles.bannerCopy}>
            <span className={styles.eyebrow}><ShieldCheck size={15} /> EMEĞİNİN BİR KARŞILIĞI VAR</span>
            <h2>{title}</h2>
            <p>{description}</p>
            <Link className={styles.action} href={href}>{label}<ArrowUpRight size={20} /></Link>
          </div>
          <span className={styles.bannerNote}>KADEME / BELGE DOĞRULAMA</span>
        </div>
      </div>
    </section>
  );
}
