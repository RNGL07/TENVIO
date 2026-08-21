import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Tone = "orange" | "green" | "red" | "neutral";

const toneClasses: Record<Tone, string> = {
  orange: "bg-brand-500/15 text-brand-700",
  green: "bg-emerald-500/15 text-emerald-700",
  red: "bg-red-500/10 text-red-700",
  neutral: "bg-black/5 text-fade",
};

export function Badge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded", toneClasses[tone], className)}
      {...props}
    />
  );
}

export function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("h-1.5 bg-sand rounded-full overflow-hidden", className)}>
      <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
