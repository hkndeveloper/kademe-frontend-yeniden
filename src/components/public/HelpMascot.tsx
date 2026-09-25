"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import styles from "./PublicHelpAssistant.module.css";

export function HelpMascot({ tracking = false }: { tracking?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [loaded, setLoaded] = useState(false);
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    if (!tracking) return;
    const node = ref.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const reset = () => { node.style.setProperty("--look-x", "0px"); node.style.setProperty("--look-y", "0px"); };
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (reduced.matches || event.pointerType !== "mouse") { reset(); return; }
        const box = node.getBoundingClientRect();
        const dx = event.clientX - (box.left + box.width * .49);
        const dy = event.clientY - (box.top + box.height * .3);
        const distance = Math.hypot(dx, dy);
        if (distance > 280) { reset(); return; }
        const amount = Math.min(distance / 90, 1);
        node.style.setProperty("--look-x", `${dx / Math.max(distance, 1) * 16 * amount}px`);
        node.style.setProperty("--look-y", `${dy / Math.max(distance, 1) * 12 * amount}px`);
      });
    };
    const leave = () => { cancelAnimationFrame(frame); reset(); };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    reduced.addEventListener("change", leave);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("pointermove", move); document.documentElement.removeEventListener("pointerleave", leave); window.removeEventListener("blur", leave); reduced.removeEventListener("change", leave); };
  }, [tracking]);

  const eyes = [
    { path: "M454 379 C448 352 467 310 497 303 C529 292 551 309 559 337 L558 388 C539 417 483 412 454 379Z", x: 510, y: 357 },
    { path: "M687 425 C682 397 698 364 722 354 C752 342 779 359 793 389 C803 408 801 434 791 452 C754 466 710 458 687 425Z", x: 741, y: 407 },
  ];
  return <span ref={ref} className={styles.mascot} aria-hidden="true">
    {tracking && loaded && <span className={styles.magic}>
      <span className={styles.aura} />
      {/* Original brand paths, cropped into four independently floating symbols. */}
      <svg className={styles.brandSpark} viewBox="130 0 370 440" focusable="false"><path d="M475.8,186.11L194.66,13.17c-25.3-15.56-57.88,2.64-57.88,32.35v350.74c0,29.92,32.99,48.09,58.28,32.1l281.15-177.81c23.75-15.02,23.53-49.73-.4-64.45Z" /></svg>
      <svg className={styles.brandSpark} viewBox="650 0 420 440" focusable="false"><path d="M825.32,110.04l-164.33,267.16c-15.03,24.43,2.55,55.89,31.24,55.89h333.29c28.89,0,46.44-31.86,30.99-56.28l-168.96-267.16c-14.5-22.93-48.02-22.72-62.23.39Z" /><rect x="828.43" y="-164.23" width="61.86" height="407.72" rx="1.91" transform="translate(819.73 898.99) rotate(-90)" /></svg>
      <svg className={styles.brandSpark} viewBox="130 550 360 370" focusable="false"><rect x="268.04" y="554.4" width="88.56" height="360.85" /><path d="M393.1,554.4h83.1c3.02,0,5.46,2.45,5.46,5.46v349.93c0,3.02-2.45,5.46-5.46,5.46h-83.1v-360.85h0Z" /><path d="M136.78,554.4h83.1c3.02,0,5.46,2.45,5.46,5.46v349.93c0,3.02-2.45,5.46-5.46,5.46h-83.1v-360.85h0Z" transform="translate(362.13 1469.66) rotate(-180)" /></svg>
      <svg className={styles.brandSpark} viewBox="705 535 330 400" focusable="false"><path d="M859.43,925.06c-30.95-38.26-145.73-153.39-145.73-227.31,0-86.53,70.4-156.93,156.93-156.93s156.93,70.4,156.93,156.93c0,72.34-109.94,182.82-143.64,224.72-5.58,6.94-15.85,8.8-24.48,2.59Z" /></svg>
      <span className={styles.twinkle} /><span className={styles.twinkle} /><span className={styles.twinkle} />
    </span>}
    <Image src="/images/kademe-helper.png" alt="" width={1280} height={1280} unoptimized loading="eager" onLoad={() => setLoaded(true)} />
    <svg viewBox="0 0 1280 1280" className={styles.eyes} style={{ visibility: loaded ? "visible" : "hidden" }}>
      <defs>
        <radialGradient id={`${id}-white`}><stop stopColor="#fffdf4" /><stop offset="1" stopColor="#d5c7b1" /></radialGradient>
        <radialGradient id={`${id}-iris`}><stop offset=".5" stopColor="#241910" /><stop offset=".65" stopColor="#916032" /><stop offset=".9" stopColor="#58351d" /><stop offset="1" stopColor="#24170d" /></radialGradient>
        {eyes.map((eye, index) => <clipPath id={`${id}-${index}`} key={index}><path d={eye.path} /></clipPath>)}
      </defs>
      {eyes.map((eye, index) => <g key={index} clipPath={`url(#${id}-${index})`}>
        <path d={eye.path} fill="#b77937" />
        <g className={tracking ? styles.blink : undefined}>
          <path d={eye.path} fill={`url(#${id}-white)`} />
          <g className={styles.pupil}>
            <ellipse cx={eye.x} cy={eye.y} rx="38" ry="44" fill={`url(#${id}-iris)`} />
            <ellipse cx={eye.x} cy={eye.y + 2} rx="23" ry="30" fill="#10110e" />
            <circle cx={eye.x - 11} cy={eye.y - 18} r="9" fill="#fffdf6" />
            <circle cx={eye.x + 11} cy={eye.y + 16} r="3" fill="#c8a36c" opacity=".65" />
          </g>
        </g>
      </g>)}
    </svg>
  </span>;
}
