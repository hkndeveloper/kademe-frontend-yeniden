"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { ArrowDown, ArrowUpRight, Pause, Play, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, type PointerEvent } from "react";
import type { SiteSettingsPayload } from "@/lib/site-config";
import { PublicButton } from "./PublicButton";
import styles from "./HomeDiscoveryHero.module.css";

interface Props {
  settings: SiteSettingsPayload["homepage"];
  projects: Array<{ id: number; name: string; slug: string }>;
  isAuthenticated: boolean;
  dashboardLink: string;
  showIntro: boolean;
}

export function HomeDiscoveryHero({ settings, projects, isAuthenticated, dashboardLink, showIntro }: Props) {
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(y, { stiffness: 70, damping: 22 });
  const rotateY = useSpring(x, { stiffness: 70, damping: 22 });
  const staticScene = reducedMotion || paused;

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (staticScene || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 8);
    y.set(-((event.clientY - bounds.top) / bounds.height - 0.5) * 6);
  }

  function resetScene() { x.set(0); y.set(0); }

  return (
    <section className={styles.hero} aria-labelledby="discovery-title">
      {settings.hero_background_image_url ? <Image src={settings.hero_background_image_url} alt="" fill unoptimized className={styles.backdrop} /> : null}
      <div className={styles.grid}>
        <div className={styles.copy}>
          <div className={styles.eyebrow}><Sparkles size={15} aria-hidden="true" />{settings.hero_badge}</div>
          <h1 id="discovery-title" className={styles.title}>
            <span>{settings.hero_title_line_1.toLocaleLowerCase("tr-TR")}</span>
            <span className={styles.accent}>{settings.hero_title_line_2.toLocaleLowerCase("tr-TR")}<span className={styles.period}>.</span></span>
            <span className={styles.future}>{[settings.hero_title_line_3, settings.hero_title_line_4].filter(Boolean).join(" ").toLocaleLowerCase("tr-TR")}</span>
          </h1>
          <p className={styles.description}>{settings.hero_description}</p>
          <div className={styles.actions}>
            {isAuthenticated ? <PublicButton href={dashboardLink} variant="dark" icon={<ArrowUpRight size={18} />}>Panelime Git</PublicButton> : <>
              <PublicButton href={settings.hero_primary_href} variant="dark" icon={<ArrowUpRight size={18} />}>{settings.hero_primary_label}</PublicButton>
              <PublicButton href={settings.hero_secondary_href} variant="ghost">{settings.hero_secondary_label}</PublicButton>
            </>}
          </div>
          <div className={styles.caption}><span /> Her adımda yeni bir sen.</div>
        </div>
        <div className={styles.scene} onPointerMove={handlePointerMove} onPointerLeave={resetScene} data-paused={staticScene ? "true" : "false"}>
          <div className={styles.orbit} aria-hidden="true" />
          <motion.div className={styles.tilt} style={{ rotateX: staticScene ? 0 : rotateX, rotateY: staticScene ? 0 : rotateY }}>
            <div className={styles.floating}>
              <Image src="/images/kademe-campus.png" alt="Sıcak ışıklı çalışma alanları, kütüphanesi ve yeşil terasıyla üç boyutlu gelişim kampüsü illüstrasyonu" width={1280} height={1280} sizes="(min-width: 1024px) 55vw, 100vw" preload className={styles.campus} />
            </div>
          </motion.div>
          <span className={`${styles.sceneLabel} ${styles.topLabel}`}><span /> Keşfet. Öğren. Dönüştür.</span>
          <span className={`${styles.sceneLabel} ${styles.bottomLabel}`}><Sparkles size={16} aria-hidden="true" /> Geleceğin burada şekillenir</span>
          {!reducedMotion ? <button type="button" className={styles.motionToggle} onClick={() => { resetScene(); setPaused(!paused); }} aria-label={paused ? "Görsel hareketini başlat" : "Görsel hareketini duraklat"} aria-pressed={paused}>{paused ? <Play size={14} /> : <Pause size={14} />}</button> : null}
        </div>
      </div>
      <div className={styles.footer}>
        <div className={styles.projects}><span className={styles.projectsLabel}>YOLCULUĞUNU SEÇ</span>{projects.slice(0, 3).map(project => <Link href={`/projects/${project.slug}`} key={project.id}>{project.name}<ArrowUpRight size={14} aria-hidden="true" /></Link>)}</div>
        {showIntro ? <a href="#about" className={styles.scroll}>Keşfetmeye devam et <ArrowDown size={16} aria-hidden="true" /></a> : null}
      </div>
    </section>
  );
}
