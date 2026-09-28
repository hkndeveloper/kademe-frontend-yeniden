import styles from "./PublicBrandLoader.module.css";

const pieces = ["130 0 370 440", "650 0 420 440", "130 550 360 370", "705 535 330 400"];

export function PublicBrandLoader({ label = "Sayfa yükleniyor", fullPage = false }: { label?: string; fullPage?: boolean }) {
  return <div className={fullPage ? styles.page : styles.loader} role="status" aria-live="polite">
    <div className={styles.art} aria-hidden="true">
      <span className={styles.glow} />
      <div className={styles.orbit}>
        {pieces.map((viewBox, index) => <svg key={viewBox} className={styles.piece} viewBox={viewBox} data-piece={index} focusable="false">
          <image href="/branding/kademe-logo-turuncu.svg" width="1200" height="1200" />
        </svg>)}
      </div>
      <span className={styles.spark} /><span className={styles.spark} />
    </div>
    <span className={styles.wordmark} aria-hidden="true">KADEME</span>
    <span className={styles.srOnly}>{label}</span>
  </div>;
}
