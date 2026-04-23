import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import GameTypeBadge from "@/components/GameTypeBadge";
import SprintLeaderboard from "@/components/SprintLeaderboard";
import LevelBadge from "@/components/LevelBadge";
import LevelProgressCard from "@/components/LevelProgressCard";
import AchievementsCard from "@/components/AchievementsCard";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDate, formatPoints, initials } from "@/lib/format";
import { currentSeason, getPlayerStats, type PlayerStats } from "@/lib/playerStats";
import { calcLevel, XP_PER_LEVEL } from "@/lib/xpSystem";
import { Crown, Gamepad2, LogIn, Percent, Sparkles, Swords, Target, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

type RankRow = {
  id: string;
  player_ref_id: string;
  player_nickname: string;
  player_type: "user" | "temp";
  avatar_url: string | null;
  position: number;
  total_points: number;
  total_profit: number;
};

type RecentGame = {
  id: string;
  name: string;
  type: "tournament" | "cash";
  date: string;
  total_pot: number;
  player_count?: number;
};

export default function Dashboard() {
  const { isLoggedIn, profile, user } = useAuth();
  const season = currentSeason();
  const [top5, setTop5] = useState<RankRow[]>([]);
  const [recent, setRecent] = useState<RecentGame[]>([]);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [levelMap, setLevelMap] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    (async () => {
      const { data: rk } = await supabase
        .from("public_rankings")
        .select("id, player_ref_id, player_nickname, player_type, avatar_url, position, total_points, total_profit")
        .eq("season_year", season)
        .order("position", { ascending: true })
        .limit(5);
      const top5Rows = (rk ?? []) as RankRow[];
      setTop5(top5Rows);

      // Buscar level dos jogadores registrados do top 5
      const userIds = top5Rows.filter((r) => r.player_type === "user").map((r) => r.player_ref_id);
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, level")
          .in("id", userIds);
        setLevelMap(new Map((profs ?? []).map((p: any) => [p.id, p.level ?? 1])));
      } else {
        setLevelMap(new Map());
      }

      const { data: gs } = await supabase
        .from("games")
        .select("id, name, type, date, total_pot")
        .order("date", { ascending: false })
        .limit(3);
      const ids = (gs ?? []).map((g) => g.id);
      let counts = new Map<string, number>();
      if (ids.length) {
        const { data: parts } = await supabase
          .from("game_participations")
          .select("game_id")
          .in("game_id", ids);
        (parts ?? []).forEach((p) => counts.set(p.game_id, (counts.get(p.game_id) ?? 0) + 1));
      }
      setRecent(((gs ?? []) as RecentGame[]).map((g) => ({ ...g, player_count: counts.get(g.id) ?? 0 })));

      if (user) {
        const s = await getPlayerStats({ userId: user.id, seasonYear: season });
        setStats(s);
        const { data: mine } = await supabase
          .from("public_rankings")
          .select("position")
          .eq("season_year", season)
          .eq("player_ref_id", user.id)
          .eq("player_type", "user")
          .maybeSingle();
        setMyRank(mine?.position ?? null);
      } else {
        setStats(null);
        setMyRank(null);
      }
    })();
  }, [user, season]);

  const displayName = profile?.nickname || profile?.full_name || "Jogador";
  const fullName = profile?.full_name || displayName;
  const xpInfo = stats ? computeXp(stats.totalPoints) : null;

  return (
    <div className="space-y-6">
      <section className="nexus-card p-5">
        {isLoggedIn && profile ? (
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/60">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayName} />}
              <AvatarFallback className="bg-gradient-gold text-primary-foreground font-bold">
                {initials(fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground">Bem-vindo de volta,</div>
              <h1 className="text-xl font-bold truncate">{displayName}</h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {xpInfo && (
                  <>
                    <span className="nexus-chip bg-primary/15 text-primary">Nível {xpInfo.level}</span>
                    <span>XP {xpInfo.xp} / {xpInfo.xpForNext}</span>
                  </>
                )}
              </div>
            </div>
            <div className="hidden text-right sm:block">
              <div className="text-xs text-muted-foreground">Ranking</div>
              <div className="text-2xl font-bold nexus-text-gold">
                {myRank ? `#${myRank}` : "—"}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold nexus-text-gold">Nexus Poker House</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                A casa oficial dos nossos torneios e cash games. Entre para acompanhar seu progresso.
              </p>
            </div>
            <Button asChild className="bg-gradient-gold text-primary-foreground hover:opacity-90">
              <Link to="/auth"><LogIn className="h-4 w-4" /> Entrar</Link>
            </Button>
          </div>
        )}
      </section>

      {isLoggedIn && stats && (() => {
        const wins = stats.history.filter((h) => h.profit_loss > 0).length;
        const winPct = stats.games > 0 ? Math.round((wins / stats.games) * 100) : 0;
        return (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatCard label="Pontos temporada" value={formatPoints(stats.totalPoints)} icon={<Sparkles className="h-5 w-5" />} tone="gold" />
            <StatCard label="Partidas" value={String(stats.games)} icon={<Gamepad2 className="h-5 w-5" />} tone="info" />
            <StatCard label="% Vitórias" value={`${winPct}%`} icon={<Percent className="h-5 w-5" />} tone="success" />
            <StatCard label="Posição" value={myRank ? `#${myRank}` : "—"} icon={<Trophy className="h-5 w-5" />} tone="gold" />
            <StatCard label="KOs" value={String(stats.kos)} icon={<Target className="h-5 w-5" />} tone="destructive" />
          </section>
        );
      })()}

      <SprintLeaderboard seasonYear={season} currentUserId={user?.id ?? null} />


      <section className="nexus-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Top 5 — Temporada {season}</h2>
          </div>
          <Button asChild size="sm" variant="ghost" className="text-primary hover:bg-primary/10">
            <Link to="/ranking">Ver ranking</Link>
          </Button>
        </div>
        {top5.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Nenhum jogador no ranking ainda.</div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-3 items-end gap-2">
              {[top5[1], top5[0], top5[2]].filter(Boolean).map((row, idx) => {
                const place = idx === 1 ? 1 : idx === 0 ? 2 : 3;
                const heights = ["h-20", "h-28", "h-16"];
                const isMe = !!user && row.player_type === "user" && row.player_ref_id === user.id;
                return (
                  <div key={row.id} className="flex flex-col items-center gap-2">
                    <Avatar className="h-12 w-12 border-2 border-primary/60">
                      {row.avatar_url && <AvatarImage src={row.avatar_url} alt={row.player_nickname} />}
                      <AvatarFallback className="bg-secondary">{initials(row.player_nickname)}</AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="text-xs font-semibold truncate max-w-[80px]">{row.player_nickname}</div>
                        {isMe && <span className="nexus-chip bg-primary/20 px-1.5 text-[9px] font-bold text-primary">Você</span>}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {season >= 2026 ? `${formatPoints(row.total_points)} pts` : formatBRL(row.total_profit)}
                      </div>
                    </div>
                    <div className={`${heights[idx]} w-full rounded-t-lg bg-gradient-gold flex items-start justify-center pt-1`}>
                      <span className="text-xs font-bold text-primary-foreground">{place}º</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="divide-y divide-border">
              {top5.slice(3).map((row) => {
                const isMe = !!user && row.player_type === "user" && row.player_ref_id === user.id;
                return (
                <div key={row.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-muted-foreground">{row.position}º</span>
                    <span className="font-medium">{row.player_nickname}</span>
                    {isMe && <span className="nexus-chip bg-primary/20 px-1.5 text-[9px] font-bold text-primary">Você</span>}
                    {row.player_type === "temp" && (
                      <span className="nexus-chip bg-secondary text-[10px] text-muted-foreground">Temp</span>
                    )}
                  </div>
                  <span className="text-primary font-semibold">
                    {season >= 2026 ? `${formatPoints(row.total_points)} pts` : formatBRL(row.total_profit)}
                  </span>
                </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="nexus-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Partidas recentes</h2>
          </div>
          <Button asChild size="sm" variant="ghost" className="text-primary hover:bg-primary/10">
            <Link to="/partidas">Ver todas</Link>
          </Button>
        </div>
        {recent.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma partida cadastrada.</div>
        ) : (
          <div className="space-y-2">
            {recent.map((g) => (
              <div key={g.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/40 p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{g.name}</span>
                    <GameTypeBadge type={g.type} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDate(g.date)} · {g.player_count} jogadores
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Pote</div>
                  <div className="font-bold text-primary">{formatBRL(g.total_pot)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isLoggedIn && xpInfo && (
        <section className="nexus-card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Award className="h-5 w-5 text-primary" /> Progresso de nível
          </h2>
          <div className="flex items-center gap-5">
            <div className="relative h-28 w-28">
              <svg viewBox="0 0 36 36" className="h-full w-full">
                <path className="stroke-secondary" strokeWidth="3" fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="stroke-primary" strokeWidth="3" strokeLinecap="round" fill="none"
                  strokeDasharray={`${xpInfo.progress}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold nexus-text-gold">{xpInfo.level}</span>
                <span className="text-[10px] text-muted-foreground">Nível</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-muted-foreground">XP</span>
                <span className="font-semibold">{xpInfo.xp} / {xpInfo.xpForNext}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-gradient-gold" style={{ width: `${xpInfo.progress}%` }} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {Math.max(0, xpInfo.xpForNext - xpInfo.xp)} XP para o próximo nível
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
