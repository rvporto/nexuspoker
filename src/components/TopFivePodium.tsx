import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";
import LevelBadge from "./LevelBadge";
import { formatBRL, formatPoints, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TopRow = {
  id: string;
  player_ref_id: string;
  player_nickname: string;
  player_type: "user" | "temp";
  avatar_url: string | null;
  position: number;
  total_points: number;
  total_profit: number;
  games_played?: number;
  level?: number | null;
  is_me?: boolean;
};

interface Props {
  rows: TopRow[];
  season: number;
  metric: "points" | "profit";
  championNickname?: string | null;
}

const PLACE_BG = {
  1: "bg-[linear-gradient(180deg,hsl(46_65%_25%/0.55)_0%,hsl(46_65%_15%/0.25)_100%)] border-primary/50",
  2: "bg-[linear-gradient(180deg,hsl(0_0%_18%/0.85)_0%,hsl(0_0%_12%/0.85)_100%)] border-border",
  3: "bg-[linear-gradient(180deg,hsl(25_70%_25%/0.55)_0%,hsl(25_70%_15%/0.2)_100%)] border-[hsl(25_70%_45%/0.6)]",
} as const;

const NUMBER_BG = {
  1: "bg-gradient-gold text-primary-foreground",
  2: "bg-secondary text-foreground border border-border",
  3: "bg-[hsl(25_75%_45%)] text-white",
} as const;

export default function TopFivePodium({ rows, season, metric, championNickname }: Props) {
  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Nenhum jogador no ranking ainda.
      </div>
    );
  }

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3, 5);
  const renderValue = (r: TopRow) =>
    metric === "points" ? `${formatPoints(r.total_points)} pts` : formatBRL(r.total_profit);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-bold">Top 5 Jogadores — Temporada {season}</h2>
          <p className="text-xs text-muted-foreground">
            {metric === "points"
              ? "Classificação baseada em pontos acumulados na temporada."
              : "Classificação baseada no lucro acumulado na temporada."}
          </p>
        </div>
      </div>

      {/* Cards 1, 2, 3 */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {top3.map((r) => {
          const place = r.position as 1 | 2 | 3;
          const isChampion =
            place === 1 && !!championNickname && championNickname === r.player_nickname;
          return (
            <div
              key={r.id}
              className={cn(
                "relative flex flex-col items-center rounded-2xl border p-3 pt-5 sm:p-4 sm:pt-6",
                PLACE_BG[place],
                r.is_me && "ring-2 ring-primary",
              )}
            >
              {isChampion && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-gold px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary-foreground shadow-[0_2px_10px_-1px_hsl(46_65%_52%/0.7)]">
                  Campeão
                </div>
              )}
              <div className="relative">
                <Avatar
                  className={cn(
                    "h-11 w-11 ring-2 ring-offset-2 ring-offset-background sm:h-16 sm:w-16",
                    place === 1 ? "ring-primary" : place === 2 ? "ring-muted" : "ring-[hsl(25_85%_55%)]",
                  )}
                >
                  {r.avatar_url && <AvatarImage src={r.avatar_url} alt={r.player_nickname} />}
                  <AvatarFallback className="bg-gradient-gold text-sm font-bold text-primary-foreground">
                    {initials(r.player_nickname)}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "absolute -bottom-2 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full text-[10px] font-extrabold shadow-md sm:h-7 sm:w-7 sm:text-sm",
                    NUMBER_BG[place],
                  )}
                >
                  {place}
                </div>
              </div>
              <div className="mt-4 flex w-full flex-col items-center text-center">
                <div className="flex w-full flex-col items-center gap-1 sm:flex-row sm:justify-center">
                  <span
                    className="line-clamp-2 w-full break-words text-[11px] font-bold leading-tight sm:line-clamp-1 sm:w-auto sm:max-w-none sm:text-sm"
                    title={r.player_nickname}
                  >
                    {r.player_nickname}
                  </span>
                  {r.level != null && <LevelBadge level={r.level} size="xs" />}
                </div>
                <div
                  className={cn(
                    "mt-1 text-base font-extrabold sm:text-lg",
                    place === 1 ? "nexus-text-gold" : "text-primary",
                  )}
                >
                  {renderValue(r)}
                </div>
                {r.games_played !== undefined && (
                  <div className="text-[10px] text-muted-foreground sm:text-[11px]">
                    {r.games_played} {r.games_played === 1 ? "partida" : "partidas"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Linhas 4 e 5 */}
      {rest.length > 0 && (
        <div className="space-y-2">
          {rest.map((r) => (
            <div
              key={r.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-2.5",
                r.is_me && "ring-2 ring-primary",
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-extrabold text-muted-foreground">
                {r.position}
              </div>
              <Avatar className="h-9 w-9 shrink-0 border border-border">
                {r.avatar_url && <AvatarImage src={r.avatar_url} alt={r.player_nickname} />}
                <AvatarFallback className="bg-secondary text-[11px]">
                  {initials(r.player_nickname)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{r.player_nickname}</span>
                  {r.level != null && <LevelBadge level={r.level} size="xs" />}
                </div>
                {r.games_played !== undefined && (
                  <div className="text-[11px] text-muted-foreground">
                    {r.games_played} {r.games_played === 1 ? "partida" : "partidas"}
                  </div>
                )}
              </div>
              <div className="text-right text-sm font-bold text-primary">{renderValue(r)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
