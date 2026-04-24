import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import GameTypeBadge from "@/components/GameTypeBadge";
import SprintLeaderboard from "@/components/SprintLeaderboard";
import LevelBadge from "@/components/LevelBadge";
import LevelProgressCard from "@/components/LevelProgressCard";
import AchievementsCard from "@/components/AchievementsCard";
import TopFivePodium, { type TopRow } from "@/components/TopFivePodium";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDate, formatPoints, initials } from "@/lib/format";
import { currentSeason, getPlayerStats, type PlayerStats } from "@/lib/playerStats";
import { calcLevel, XP_PER_LEVEL } from "@/lib/xpSystem";
import { Award, Gamepad2, LogIn, Percent, Sparkles, Swords, Target, Trophy } from "lucide-react";
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
  const playerXp = profile?.experience_points ?? 0;
  const playerLevel = profile?.level ?? calcLevel(playerXp);
  const xpInLevel = playerXp % XP_PER_LEVEL;

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
              <h1 className="flex items-center gap-2 text-xl font-bold truncate">
                <span className="truncate">{displayName}</span>
                <LevelBadge level={playerLevel} size="md" />
              </h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>XP {xpInLevel} / {XP_PER_LEVEL}</span>
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
        const podiums = stats.history.filter(
          (h) => h.game_type === "tournament" && h.position && h.position >= 1 && h.position <= 3,
        ).length;
        const tiles: { label: string; value: string; icon: JSX.Element; tone: string }[] = [
          { label: "Pontos", value: formatPoints(stats.totalPoints), icon: <Sparkles className="h-3.5 w-3.5" />, tone: "bg-primary/15 text-primary" },
          { label: "Posição", value: myRank ? `#${myRank}` : "—", icon: <Trophy className="h-3.5 w-3.5" />, tone: "bg-primary/15 text-primary" },
          { label: "Partidas", value: String(stats.games), icon: <Gamepad2 className="h-3.5 w-3.5" />, tone: "bg-info/15 text-info" },
          { label: "Pódios", value: String(podiums), icon: <Award className="h-3.5 w-3.5" />, tone: "bg-[hsl(46_65%_52%/0.15)] text-primary" },
          { label: "% Vitórias", value: `${winPct}%`, icon: <Percent className="h-3.5 w-3.5" />, tone: "bg-success/15 text-success" },
          { label: "KOs", value: String(stats.kos), icon: <Target className="h-3.5 w-3.5" />, tone: "bg-destructive/15 text-destructive" },
        ];
        return (
          <section className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {tiles.map((t) => (
              <div key={t.label} className="nexus-card flex flex-col items-start gap-1 p-2.5">
                <div className="flex w-full items-center justify-between">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {t.label}
                  </span>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-md ${t.tone}`}>
                    {t.icon}
                  </span>
                </div>
                <span className="text-base font-extrabold leading-tight">{t.value}</span>
              </div>
            ))}
          </section>
        );
      })()}

      <section className="nexus-card p-4 sm:p-5">
        <TopFivePodium
          rows={top5.map((r) => ({
            ...r,
            level: r.player_type === "user" ? (levelMap.get(r.player_ref_id) ?? 1) : null,
            is_me: !!user && r.player_type === "user" && r.player_ref_id === user.id,
          })) as TopRow[]}
          season={season}
          metric={season >= 2026 ? "points" : "profit"}
        />
        <div className="mt-3 flex justify-end">
          <Button asChild size="sm" variant="ghost" className="text-primary hover:bg-primary/10">
            <Link to="/ranking">Ver ranking completo</Link>
          </Button>
        </div>
      </section>

      <SprintLeaderboard seasonYear={season} currentUserId={user?.id ?? null} />

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

      {isLoggedIn && profile && (
        <section className="grid gap-4 lg:grid-cols-2">
          <LevelProgressCard experiencePoints={playerXp} level={playerLevel} />
          <AchievementsCard
            achievementsUnlocked={profile.achievements_unlocked ?? []}
            achievementsRrCount={profile.achievements_rr_count ?? {}}
            achievementsRrProgress={profile.achievements_rr_progress ?? {}}
            achievementsSeasonal={profile.achievements_seasonal ?? {}}
          />
        </section>
      )}
    </div>
  );
}
