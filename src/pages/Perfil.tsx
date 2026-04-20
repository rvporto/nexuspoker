import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import GameTypeBadge from "@/components/GameTypeBadge";
import { useAuth } from "@/context/AuthContext";
import { mockGames } from "@/data/mockData";
import { formatBRL, formatDate, initials } from "@/lib/format";
import { Edit3, Gamepad2, Sparkles, Target, TrendingUp, Trophy } from "lucide-react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

export default function Perfil() {
  const { isLoggedIn, profile, loading } = useAuth();
  if (loading) return null;
  if (!isLoggedIn) return <Navigate to="/auth" replace />;
  if (!profile) return null;
  const displayName = profile.nickname || profile.full_name || "Jogador";
  const fullName = profile.full_name || displayName;

  return (
    <div className="space-y-5">
      <section className="nexus-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary/60">
              <AvatarFallback className="bg-gradient-gold text-xl font-bold text-primary-foreground">
                {initials(fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold nexus-text-gold">{displayName}</h1>
              <p className="text-sm text-muted-foreground">{fullName}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="nexus-chip bg-primary/15 text-primary">Nível {profile.level}</span>
                {profile.current_rank && (
                  <span className="nexus-chip bg-info/15 text-info">Ranking #{profile.current_rank}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-primary/30 text-foreground hover:bg-primary/10" onClick={() => toast.info("Edição de perfil — Fase 4.")}>
              <Edit3 className="h-4 w-4" /> Editar
            </Button>
            <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90" onClick={() => toast.info("Geração de avatar IA — Fase 4.")}>
              <Sparkles className="h-4 w-4" /> Avatar IA
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Partidas" value="8" icon={<Gamepad2 className="h-5 w-5" />} tone="info" />
        <StatCard label="Vitórias" value="3" icon={<Trophy className="h-5 w-5" />} tone="gold" />
        <StatCard label="Lucro total" value={formatBRL(640)} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
        <StatCard label="KOs" value="12" icon={<Target className="h-5 w-5" />} tone="destructive" />
      </section>

      <section className="nexus-card p-5">
        <h2 className="mb-3 text-lg font-bold">Histórico de partidas</h2>
        <div className="divide-y divide-border">
          {mockGames.map((g) => (
            <div key={g.id} className="flex items-center justify-between py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{g.name}</span>
                  <GameTypeBadge type={g.type} />
                </div>
                <div className="text-xs text-muted-foreground">{formatDate(g.date)}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-muted-foreground">Resultado</div>
                <div className="font-bold text-success">+{formatBRL(120)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
