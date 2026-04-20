import { cn } from "@/lib/utils";

interface Props {
  type: "tournament" | "cash";
  className?: string;
}
export default function GameTypeBadge({ type, className }: Props) {
  const isTournament = type === "tournament";
  return (
    <span
      className={cn(
        "nexus-chip",
        isTournament
          ? "bg-tournament/15 text-tournament"
          : "bg-cash/15 text-cash",
        className,
      )}
    >
      {isTournament ? "Torneio" : "Cash Game"}
    </span>
  );
}
