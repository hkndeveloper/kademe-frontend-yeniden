import { type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type PublicMarqueeProps = {
  className?: string;
  durationSeconds?: number;
  items: ReactNode[];
};

type MarqueeStyle = CSSProperties & {
  "--kdm-marquee-duration": string;
};

export function PublicMarquee({ className, durationSeconds = 30, items }: PublicMarqueeProps) {
  const safeItems = items.length > 0 ? items : ["KADEME"];
  const duration = Math.min(90, Math.max(8, Number(durationSeconds) || 30));
  const style: MarqueeStyle = { "--kdm-marquee-duration": `${duration}s` };

  return (
    <section className={cn("kdm-public-marquee relative overflow-hidden bg-[#edecec]", className)} aria-label="KADEME duyuru akışı">
      <div className="kdm-public-marquee-shell">
        <div
          className="kdm-public-marquee-track"
          style={style}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.animationPlayState = 'paused')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.animationPlayState = 'running')}
        >
          {[0, 1, 2].map((loop) => (
            <div key={loop} className="kdm-public-marquee-group" aria-hidden={loop > 0 ? "true" : undefined}>
              {safeItems.map((item, index) => (
                <div key={`${loop}-${index}`} className="kdm-public-marquee-item">
                  <span className="kdm-public-marquee-text">{item}</span>
                  <span className="kdm-public-marquee-mark" aria-hidden="true" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}