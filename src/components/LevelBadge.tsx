import { cn } from "@/lib/utils";

interface Props {
  level: number;
  size?: "xs" | "sm" | "md";
  className?: string;
}

/**
 * Badge compacto exibindo o nível do jogador.
 * Usado ao lado do nome em rankings, sprint, top 5, pódio, etc.
 */
export default function LevelBadge({ level, size = "sm", className }: Props) {
  const sizeMap = {
    xs: "h-4 min-w-4 px-1 text-[9px]",
    sm: "h-5 min-w-5 px-1.5 text-[10px]",
    md: "h-6 min-w-6 px-2 text-xs",
  } as const;
  return (
    <span
      title={`Nível ${level}`}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-gradient-gold font-bold leading-none text-primary-foreground shadow-[0_0_6px_-1px_hsl(46_65%_52%/0.6)]",
        sizeMap[size],
        className,
      )}
    >
      {level}
    </span>
  );
}
