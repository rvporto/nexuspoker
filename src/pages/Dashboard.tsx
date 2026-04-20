import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import GameTypeBadge from "@/components/GameTypeBadge";
import { useAuth } from "@/context/AuthContext";
import { mockGames, mockRanking2026 } from "@/data/mockData";
import { formatBRL, formatDate, initials } from "@/lib/format";
import { Award, Crown, DollarSign, Gamepad2, LogIn, Medal, Swords, Target, TrendingUp, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { isLoggedIn, profile } = useAuth();
  const displayName = profile?.nickname || profile?.full_name || "Jogador";
  const fullName = profile?.full_name || displayName;
  const top5 = mockRanking2026.slice(0, 5);
  const recentGames = mockGames.slice(0, 3);

  return (
    <div className="space-y-6">
      <section className="nexus-card p-5">
        {isLoggedIn && profile ? (
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/60">
              <AvatarFallback className="bg-gradient-gold text-primary-foreground font-bold">
                {initials(fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground">Bem-vindo de volta,</div>
              <h1 className="text-xl font-bold truncate">{displayName}</h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="nexus-chip bg-primary/15 text-primary">Nível {profile.level}</span>
                <span>XP {profile.xp} / 1000</span>
              </div>
            </div>
            <div className="hidden text-right sm:block">
              <div className="text-xs text-muted-foreground">Ranking</div>
              <div className="text-2xl font-bold nexus-text-gold">
                {profile.current_rank ? `#${profile.current_rank}` : "—"}
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

      {isLoggedIn && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Partidas" value="8" icon={<Gamepad2 className="h-5 w-5" />} tone="info" />
          <StatCard label="Vitórias" value="3" icon={<Trophy className="h-5 w-5" />} tone="gold" />
          <StatCard label="Lucro total" value={formatBRL(640)} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
          <StatCard label="KOs" value="12" icon={<Target className="h-5 w-5" />} tone="destructive" />
        </section>
      )}

      <section className="nexus-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Top 5 — Temporada 2026</h2>
          </div>
          <Button asChild size="sm" variant="ghost" className="text-primary hover:bg-primary/10">
            <Link to="/ranking">Ver ranking</Link>
          </Button>
        </div>
        <div className="mb-4 grid grid-cols-3 items-end gap-2">
          {[top5[1], top5[0], top5[2]].map((row, idx) => {
            const place = idx === 1 ? 1 : idx === 0 ? 2 : 3;
            const heights = ["h-20", "h-28", "h-16"];
            return (
              <div key={row.player.id} className="flex flex-col items-center gap-2">
                <Avatar className="h-12 w-12 border-2 border-primary/60">
                  <AvatarFallback className="bg-secondary">{initials(row.player.nickname)}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <div className="text-xs font-semibold truncate max-w-[90px]">{row.player.nickname}</div>
                  <div className="text-[11px] text-muted-foreground">{row.points} pts</div>
                </div>
                <div
                  className={`${heights[idx]} w-full rounded-t-lg bg-gradient-gold flex items-start justify-center pt-1`}
                >
                  <span className="text-xs font-bold text-primary-foreground">{place}º</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="divide-y divide-border">
          {top5.slice(3).map((row) => (
            <div key={row.player.id} className="flex items-center justify-between py-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="w-6 text-muted-foreground">{row.position}º</span>
                <span className="font-medium">{row.player.nickname}</span>
                {row.player.isTemporary && (
                  <span className="nexus-chip bg-secondary text-[10px] text-muted-foreground">Temporário</span>
                )}
              </div>
              <span className="text-primary font-semibold">{row.points} pts</span>
            </div>
          ))}
        </div>
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
        <div className="space-y-2">
          {recentGames.map((g) => (
            <div key={g.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/40 p-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{g.name}</span>
                  <GameTypeBadge type={g.type} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatDate(g.date)} · {g.players} jogadores
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Pote</div>
                <div className="font-bold text-primary">{formatBRL(g.totalPot)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {isLoggedIn && (
        <section className="grid gap-6 md:grid-cols-2">
          <div className="nexus-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
              <Award className="h-5 w-5 text-primary" /> Progresso de nível
            </h2>
            <div className="flex items-center gap-5">
              <div className="relative h-28 w-28">
                <svg viewBox="0 0 36 36" className="h-full w-full">
                  <path
                    className="stroke-secondary"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="stroke-primary"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray="82, 100"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold nexus-text-gold">4</span>
                  <span className="text-[10px] text-muted-foreground">Nível</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">XP</span>
                  <span className="font-semibold">820 / 1000</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full w-[82%] bg-gradient-gold" />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">180 XP para o próximo nível</p>
              </div>
            </div>
          </div>

          <div className="nexus-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
              <Medal className="h-5 w-5 text-primary" /> Conquistas <span className="text-sm font-normal text-muted-foreground">3/6</span>
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {["Primeira Vitória", "5 Partidas", "10 Partidas", "Lucrativo", "Grande Vencedor", "Veterano"].map((label, i) => {
                const unlocked = i < 3;
                return (
                  <div
                    key={label}
                    className={`rounded-lg border p-3 text-center text-xs ${unlocked ? "border-primary/40 bg-primary/10 text-primary" : "border-border/50 bg-secondary/40 text-muted-foreground"}`}
                  >
                    <DollarSign className="mx-auto mb-1 h-4 w-4" />
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
