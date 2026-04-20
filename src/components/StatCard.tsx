import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "success" | "destructive" | "info" | "gold";
  sub?: ReactNode;
  className?: string;
}

const toneMap: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-secondary/60 text-foreground",
  success: "bg-success/15 text-success",
  destructive: "bg-destructive/15 text-destructive",
  info: "bg-info/15 text-info",
  gold: "bg-primary/15 text-primary",
};

export default function StatCard({ label, value, icon, tone = "default", sub, className }: StatCardProps) {
  return (
    <div className={cn("nexus-card p-4 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold truncate">{value}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </div>
      {icon && (
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", toneMap[tone])}>
          {icon}
        </div>
      )}
    </div>
  );
}
