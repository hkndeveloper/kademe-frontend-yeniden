"use client";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
export function BenefitArtwork({
  index,
  labels,
}: {
  index: number;
  labels: string[];
}) {
  const reduced = useReducedMotion();
  switch (index % 4) {
    case 0:
      return (
        <div className="benefits-progress-inner" aria-hidden="true">
          {labels.slice(0, 4).map((label, i) => (
            <div className="benefits-progress-item" key={label}>
              <motion.div
                className="progress-line"
                initial={{ width: "15%" }}
                whileInView={{ width: [60, 50, 40, 80][i] + "%" }}
                viewport={{ once: true }}
                transition={{
                  duration: reduced ? 0 : 1.5,
                  ease: [0.215, 0.61, 0.355, 1],
                }}
              />
              <div className="progress-text fw-semibold">
                <i
                  className={`icon ${["icon-bullseye-solid", "icon-bolt-solid", "icon-shield-alt-solid", "icon-coins-solid"][i]}`}
                />
                {label}
              </div>
            </div>
          ))}
        </div>
      );
    case 1:
      return (
        <div className="benefits-step-inner" aria-hidden="true">
          <div className="line-step" />
          {[0, 1, 2].map((i) => (
            <div className="step-item" key={i}>
              <i className="icon icon-check-solid" />
            </div>
          ))}
        </div>
      );
    case 2:
      return (
        <div className="benefits-secure-inner text-center" aria-hidden="true">
          <Image
            src="/aigocy-original/images/item/benefits-1.svg"
            alt=""
            width={325}
            height={244}
            unoptimized
          />
        </div>
      );
    default:
      return (
        <div className="benefits-design-inner" aria-hidden="true">
          <Image
            className="item-img-1"
            src="/aigocy-original/images/item/benefits-2.svg"
            alt=""
            width={325}
            height={244}
            unoptimized
          />
          <Image
            className="item-img-2 rightleft"
            src="/aigocy-original/images/item/benefits-3.png"
            alt=""
            width={150}
            height={150}
            unoptimized
          />
          <Image
            className="item-img-3 updown"
            src="/aigocy-original/images/item/benefits-4.png"
            alt=""
            width={150}
            height={150}
            unoptimized
          />
        </div>
      );
  }
}
