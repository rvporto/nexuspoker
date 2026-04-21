import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  current: number;
  previous?: number;
}

export default function RankMovementBadge({ current, previous }: Props) {
  if (previous === undefined || previous === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-secondary px-1 py-0.5 text-[8px] font-bold text-muted-foreground">
        NEW
      </span>
    );
  }
  const diff = previous - current;
  if (diff === 0) {
    return (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Minus className="h-2.5 w-2.5" />
      </span>
    );
  }
  const up = diff > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1 py-0.5 text-[9px] font-bold leading-none",
        up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
      )}
    >
      {up ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
      {Math.abs(diff)}
    </span>
  );
}
