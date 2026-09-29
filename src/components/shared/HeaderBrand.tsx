"use client";

import { motion, useReducedMotion } from "framer-motion";
import styles from "./HeaderBrand.module.css";

const pieces = ["130 0 370 440", "650 0 420 440", "130 550 360 370", "705 535 330 400"];
const restingAngles = [-13, 12, -12, 15];
const nextCorner = [
  { x: 151, y: -5, rotate: 12 },
  { x: -4, y: 33, rotate: 15 },
  { x: -8, y: -30, rotate: -13 },
  { x: -141, y: -2, rotate: -12 },
];

export function HeaderBrand() {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div className={styles.brand} aria-hidden="true"
      initial="rest" animate="rest" whileHover={reducedMotion ? "rest" : "swapped"}>
      <svg className={styles.wordmark} viewBox="0 0 940 210" focusable="false">
        <image href="/branding/kademe-wordmark.svg" width="940" height="210" />
      </svg>
      {pieces.map((viewBox, index) => (
        <motion.div className={styles.piece} data-piece={index} key={viewBox}
          variants={{
            rest: { x: 0, y: 0, rotate: restingAngles[index] },
            swapped: nextCorner[index],
          }}
          transition={{ type: "spring", stiffness: 95, damping: 21, mass: 1 }}>
          <svg viewBox={viewBox} focusable="false">
            <image href="/branding/kademe-logo-turuncu.svg" width="1200" height="1200" />
          </svg>
          <i className={styles.spark} />
        </motion.div>
      ))}
    </motion.div>
  );
}
