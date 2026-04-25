import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initials, formatBRL, formatPoints } from "@/lib/format";
import LevelBadge from "@/components/LevelBadge";
import { Crown, Medal, Award, Gamepad2, Target, TrendingUp } from "lucide-react";

export type PodiumEntry = {
  id: string;
  player_nickname: string;
  avatar_url: string | null;
  total_points: number;
  total_profit: number;
  games_played: number;
  wins: number;
  level?: number;
  is_me?: boolean;
};

interface Props {
  place: 1 | 2 | 3;
  entry: PodiumEntry;
  metric: "profit" | "points";
  championYear?: number | null;
}

const PLACE_META = {
  1: {
    icon: Crown,
    badgeBg: "bg-gradient-to-br from-primary to-primary-glow",
    iconColor: "text-primary-foreground",
    cardBorder: "border-primary",
    cardBg:
      "bg-[linear-gradient(180deg,hsl(46_65%_52%/0.18)_0%,hsl(46_65%_52%/0.04)_100%)]",
    avatarRing: "ring-primary",
    glow: "shadow-[0_0_24px_-4px_hsl(46_65%_52%/0.55)]",
  },
  2: {
    icon: Medal,
    badgeBg: "bg-secondary border border-border",
    iconColor: "text-foreground/80",
    cardBorder: "border-border",
    cardBg: "bg-card",
    avatarRing: "ring-muted",
    glow: "",
  },
  3: {
    icon: Award,
    badgeBg: "bg-[hsl(25_60%_30%)] border border-[hsl(25_70%_45%)]",
    iconColor: "text-[hsl(25_95%_70%)]",
    cardBorder: "border-[hsl(25_70%_35%)]",
    cardBg:
      "bg-[linear-gradient(180deg,hsl(25_70%_25%/0.4)_0%,hsl(25_70%_15%/0.1)_100%)]",
    avatarRing: "ring-[hsl(25_95%_55%)]",
    glow: "",
  },
} as const;

export default function PodiumCard({ place, entry, metric, championYear }: Props) {
  const meta = PLACE_META[place];
  const Icon = meta.icon;
  const valueText =
    metric === "points" ? `${formatPoints(entry.total_points)} pts` : formatBRL(entry.total_profit);
  const winRate =
    entry.games_played > 0 ? Math.round((entry.wins / entry.games_played) * 100) : 0;

  return (
    <div className="relative flex flex-col items-center pt-5 sm:pt-7">
      {/* Top circular badge (crown / medal / award) */}
      <div
        className={cn(
          "absolute top-0 z-10 flex h-9 w-9 items-center justify-center rounded-full sm:h-12 sm:w-12",
          meta.badgeBg,
          place === 1 && "shadow-[0_4px_16px_-2px_hsl(46_65%_52%/0.6)]",
        )}
      >
        <Icon className={cn("h-4 w-4 sm:h-6 sm:w-6", meta.iconColor)} />
      </div>

      {/* Card */}
      <div
        className={cn(
          "w-full rounded-2xl border-2 p-2.5 pt-6 transition-all sm:p-4 sm:pt-8",
          meta.cardBorder,
          meta.cardBg,
          meta.glow,
        )}
      >
        {/* Avatar */}
        <div className="flex justify-center">
          <Avatar
            className={cn(
              "h-14 w-14 ring-2 ring-offset-2 ring-offset-background sm:h-20 sm:w-20",
              meta.avatarRing,
              place === 1 && "h-16 w-16 sm:h-24 sm:w-24",
            )}
          >
            {entry.avatar_url && (
              <AvatarImage src={entry.avatar_url} alt={entry.player_nickname} />
            )}
            <AvatarFallback className="bg-gradient-gold text-sm font-bold text-primary-foreground sm:text-lg">
              {initials(entry.player_nickname)}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name + value */}
        <div className="mt-2 text-center sm:mt-3">
          <div className="flex flex-wrap items-center justify-center gap-1">
            <span className="truncate text-[11px] font-bold sm:text-base">
              {entry.player_nickname}
            </span>
            {entry.level !== undefined && <LevelBadge level={entry.level} size="xs" />}
            {entry.is_me && (
              <span className="rounded-full bg-primary/20 px-1 py-0.5 text-[8px] font-bold uppercase text-primary sm:px-1.5 sm:text-[9px]">
                Você
              </span>
            )}
          </div>
          <div
            className={cn(
              "mt-0.5 text-sm font-extrabold sm:text-xl",
              metric === "profit" && entry.total_profit >= 0
                ? "text-success"
                : metric === "profit"
                  ? "text-destructive"
                  : "text-primary",
            )}
          >
            {valueText}
          </div>
          {championYear && place === 1 && (
            <div className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary sm:gap-1 sm:px-2 sm:text-[10px]">
              <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Campeão {championYear}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
