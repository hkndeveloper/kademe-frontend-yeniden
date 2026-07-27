import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function PublicHeroDecor({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} {...props}>
      <div className="kdm-public-grid absolute inset-0 opacity-[0.36]" />
      <div className="kdm-public-light-box absolute left-1/2 top-0 hidden h-72 w-[min(56rem,72vw)] -translate-x-1/2 lg:block" />
      <div className="kdm-public-line-run absolute left-0 top-24 h-px w-72 bg-gradient-to-r from-transparent via-[#fd3a25]/55 to-transparent" />
      <div className="kdm-public-line-run kdm-public-line-run-delay absolute bottom-24 right-0 h-px w-80 bg-gradient-to-r from-transparent via-[#09090b]/28 to-transparent" />
      <div className="absolute right-[7%] top-[14%] h-28 w-28 rounded-full border border-[#fd3a25]/20" />
      <div className="absolute right-[calc(7%+18px)] top-[calc(14%+18px)] h-[76px] w-[76px] rounded-full border border-[#09090b]/10" />
      <PublicElectricLines className="hidden opacity-70 lg:block" />
    </div>
  );
}

export function PublicSectionLines({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden", className)} {...props}>
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-[#fd3a25]/16 via-transparent to-transparent" />
      <div className="absolute left-[12%] top-10 h-px w-52 bg-gradient-to-r from-transparent via-[#fd3a25]/35 to-transparent" />
      <div className="absolute bottom-10 right-[10%] h-px w-64 bg-gradient-to-r from-transparent via-[#09090b]/18 to-transparent" />
    </div>
  );
}

export function PublicElectricLines({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("kdm-public-electric-lines absolute inset-x-[5%] top-[18%] bottom-[18%]", className)} {...props}>
      <div className="kdm-public-electric-center" />
      <div className="kdm-public-electric-bend kdm-public-electric-bend-left">
        <span className="kdm-public-electric-run kdm-public-electric-run-top" />
        <span className="kdm-public-electric-run kdm-public-electric-run-bottom" />
      </div>
      <div className="kdm-public-electric-bend kdm-public-electric-bend-right">
        <span className="kdm-public-electric-run kdm-public-electric-run-top" />
        <span className="kdm-public-electric-run kdm-public-electric-run-bottom" />
      </div>
      <span className="kdm-public-electric-spark kdm-public-electric-spark-left" />
      <span className="kdm-public-electric-spark kdm-public-electric-spark-right" />
    </div>
  );
}