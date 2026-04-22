import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { formatPoints, initials } from "@/lib/format";
import { Medal, Zap } from "lucide-react";

const SPRINT_SIZE = 5;

type ParticipationRow = {
  game_id: string;
  user_id: string | null;
  temp_player_id: string | null;
  player_nickname: string;
  ranking_points: number;
  profit_loss: number;
  games: { id: string; date: string; season_year: number; status: string } | null;
};

type LeaderEntry = {
  key: string;
  player_type: "user" | "temp";
  player_ref_id: string;
  nickname: string;
  avatar_url: string | null;
  points: number;
  profit: number;
  games_in_sprint: number;
};

type Props = {
  seasonYear: number;
  currentUserId?: string | null;
};

export default function SprintLeaderboard({ seasonYear, currentUserId }: Props) {
  const [parts, setParts] = useState<ParticipationRow[]>([]);
  const [profileMap, setProfileMap] = useState<Map<string, { nickname: string | null; avatar_url: string | null }>>(new Map());
  const [tempMap, setTempMap] = useState<Map<string, { nickname: string; avatar_url: string | null }>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("game_participations")
        .select("game_id, user_id, temp_player_id, player_nickname, ranking_points, profit_loss, games!inner(id, date, season_year, status)")
        .eq("games.season_year", seasonYear)
        .eq("games.status", "finished");
      const rows = ((data ?? []) as any[]).filter((r) => r.games) as ParticipationRow[];
      setParts(rows);

      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean) as string[]));
      const tempIds = Array.from(new Set(rows.map((r) => r.temp_player_id).filter(Boolean) as string[]));
      const [{ data: profs }, { data: temps }] = await Promise.all([
        userIds.length ? supabase.from("profiles").select("id, nickname, avatar_url").in("id", userIds) : Promise.resolve({ data: [] as any[] }),
        tempIds.length ? supabase.from("temporary_players").select("id, nickname, avatar_url").in("id", tempIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      setProfileMap(new Map((profs ?? []).map((p: any) => [p.id, { nickname: p.nickname, avatar_url: p.avatar_url }])));
      setTempMap(new Map((temps ?? []).map((p: any) => [p.id, { nickname: p.nickname, avatar_url: p.avatar_url }])));
      setLoading(false);
    })();
  }, [seasonYear]);

  // Agrupa partidas únicas em ordem cronológica (mais antiga primeiro)
  const orderedGameIds = useMemo(() => {
    const dateMap = new Map<string, string>();
    parts.forEach((p) => {
      if (p.games && !dateMap.has(p.game_id)) dateMap.set(p.game_id, p.games.date);
    });
    return Array.from(dateMap.entries())
      .sort((a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime())
      .map(([id]) => id);
  }, [parts]);

  const totalGames = orderedGameIds.length;
  const sprintIndex = totalGames === 0 ? 0 : Math.floor((totalGames - 1) / SPRINT_SIZE);
  const sprintNumber = sprintIndex + 1;
  const sprintStart = sprintIndex * SPRINT_SIZE; // 0-based
  const sprintEnd = Math.min(sprintStart + SPRINT_SIZE, totalGames); // exclusive
  const sprintGameIds = useMemo(() => new Set(orderedGameIds.slice(sprintStart, sprintEnd)), [orderedGameIds, sprintStart, sprintEnd]);
  const gamesInSprint = sprintEnd - sprintStart;
  const usePoints = seasonYear >= 2026;

  const leaders = useMemo<LeaderEntry[]>(() => {
    const map = new Map<string, LeaderEntry>();
    parts.forEach((p) => {
      if (!sprintGameIds.has(p.game_id)) return;
      const isUser = !!p.user_id;
      const refId = (isUser ? p.user_id : p.temp_player_id) as string | null;
      if (!refId) return;
      const key = `${isUser ? "user" : "temp"}:${refId}`;
      const src = isUser ? profileMap.get(refId) : tempMap.get(refId);
      const existing = map.get(key) ?? {
        key,
        player_type: isUser ? "user" : "temp",
        player_ref_id: refId,
        nickname: src?.nickname || p.player_nickname,
        avatar_url: src?.avatar_url ?? null,
        points: 0,
        profit: 0,
        games_in_sprint: 0,
      };
      existing.points += Number(p.ranking_points ?? 0);
      existing.profit += Number(p.profit_loss ?? 0);
      existing.games_in_sprint += 1;
      map.set(key, existing);
    });
    const list = Array.from(map.values());
    list.sort((a, b) => {
      if (usePoints) {
        if (b.points !== a.points) return b.points - a.points;
        return b.profit - a.profit;
      }
      return b.profit - a.profit;
    });
    return list;
  }, [parts, sprintGameIds, profileMap, tempMap, usePoints]);

  // Top 5 + linha do usuário se ele estiver fora
  const visible = useMemo(() => {
    const top5 = leaders.slice(0, 5).map((l, idx) => ({ ...l, position: idx + 1 }));
    if (!currentUserId) return top5;
    const meIdx = leaders.findIndex((l) => l.player_type === "user" && l.player_ref_id === currentUserId);
    if (meIdx === -1 || meIdx < 5) return top5;
    return [...top5, { ...leaders[meIdx], position: meIdx + 1 }];
  }, [leaders, currentUserId]);

  return (
    <section className="nexus-card p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-bold">Sprint #{sprintNumber}</h2>
            <p className="text-xs text-muted-foreground">
              {gamesInSprint === 0
                ? "Aguardando primeira partida da temporada"
                : `Partidas ${sprintStart + 1}–${sprintEnd} de ${seasonYear} · ${gamesInSprint}/${SPRINT_SIZE} jogadas`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary">
          <Medal className="h-3 w-3" />
          {usePoints ? "Pontos" : "Lucro"}
        </div>
      </div>

      {loading ? (
        <div className="py-6 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : leaders.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Nenhuma partida disputada neste sprint ainda.
        </div>
      ) : (
        <div className="space-y-1.5">
          {visible.map((row, idx) => {
            const isMe = !!currentUserId && row.player_type === "user" && row.player_ref_id === currentUserId;
            const isLeader = row.position === 1;
            const isOutOfTop5 = row.position > 5;
            return (
              <div
                key={row.key}
                className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                  isLeader
                    ? "border-primary/40 bg-primary/10"
                    : isMe
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/60 bg-secondary/30"
                } ${isOutOfTop5 ? "mt-2 border-dashed" : ""}`}
              >
                <div className="flex w-8 items-center justify-center">
                  {isLeader ? (
                    <Medal className="h-5 w-5 text-primary" />
                  ) : (
                    <span className={`text-sm font-bold ${row.position <= 3 ? "text-primary" : "text-muted-foreground"}`}>
                      {row.position}º
                    </span>
                  )}
                </div>
                <Avatar className="h-9 w-9 border border-border">
                  {row.avatar_url && <AvatarImage src={row.avatar_url} alt={row.nickname} />}
                  <AvatarFallback className="bg-secondary text-[11px]">{initials(row.nickname)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{row.nickname}</span>
                    {isMe && (
                      <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                        Você
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {row.games_in_sprint}/{gamesInSprint} partidas no sprint
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${isLeader ? "nexus-text-gold" : "text-foreground"}`}>
                    {usePoints
                      ? `${formatPoints(row.points)} pts`
                      : row.profit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
