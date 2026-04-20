import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  current: number;
  previous?: number;
}

export default function RankMovementBadge({ current, previous }: Props) {
  if (previous === undefined) {
    return (
      <span className="nexus-chip bg-secondary text-muted-foreground">
        <span className="text-[10px] font-semibold">NOVO</span>
      </span>
    );
  }
  const diff = previous - current; // positive = up
  if (diff === 0) {
    return (
      <span className="nexus-chip bg-secondary text-muted-foreground">
        <Minus className="h-3 w-3" />
      </span>
    );
  }
  const up = diff > 0;
  return (
    <span
      className={cn(
        "nexus-chip",
        up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
      )}
    >
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      <span className="text-[10px] font-semibold">{Math.abs(diff)}</span>
    </span>
  );
}
