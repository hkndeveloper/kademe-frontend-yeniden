"use client";

import Image from "next/image";
import { Pause, Play, Send } from "lucide-react";
import { useState } from "react";
import styles from "./ContactMessageArtwork.module.css";

export function ContactMessageArtwork() {
  const [paused, setPaused] = useState(false);
  return <section className={styles.card} data-paused={paused} aria-labelledby="contact-art-title">
    <div className={styles.top}>
      <span><Send size={13} /> İletişim</span>
      <button type="button" className={styles.motionToggle} aria-label={paused ? "Uçak hareketini başlat" : "Uçak hareketini duraklat"} onClick={() => setPaused(!paused)}>
        {paused ? <Play size={13} /> : <Pause size={13} />}
      </button>
    </div>
    <div className={styles.scene}>
      <Image src="/images/contact-mailbox.png" alt="Zarflarla dolu krem ve adaçayı renkli üç boyutlu posta kutusu" width={1280} height={1280} unoptimized className={styles.mailbox} />
      <svg className={styles.trail} viewBox="0 0 400 280" fill="none" aria-hidden="true"><path d="M148 171C203 220 328 180 266 136C228 110 209 158 266 154C309 151 314 95 340 64" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 7" strokeLinecap="round" /></svg>
      <span className={styles.flight} aria-hidden="true"><svg className={styles.plane} viewBox="0 0 100 80" fill="none"><path d="M5 32L94 5L64 73L43 49L5 32Z" fill="#fffdf2" stroke="#c9c9ad" strokeWidth="1.2" strokeLinejoin="round" /><path d="M43 49L94 5L32 40L36 67L43 49Z" fill="#95a580" /><path d="M43 49L36 67L52 60" fill="#62764e" /><path d="M43 49L64 73L94 5" fill="#eee8d6" /><path d="M64 73L94 5L43 49" stroke="#d5c5a2" strokeWidth="1.2" strokeLinejoin="round" /></svg></span>
    </div>
    <div className={styles.copy}>
      <h2 id="contact-art-title">KADEME ile bağlantıda kalın</h2>
      <p>Başvuru, proje, faaliyet ve destek talepleriniz tek yerden ekibe ulaşır.</p>
    </div>
  </section>;
}
