import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import GameTypeBadge from "@/components/GameTypeBadge";
import LevelBadge from "@/components/LevelBadge";
import LevelProgressCard from "@/components/LevelProgressCard";
import AchievementsCard from "@/components/AchievementsCard";
import { useAuth } from "@/context/AuthContext";
import { formatBRL, formatDate, initials } from "@/lib/format";
import { Award, Coins, ChevronDown, ChevronUp, Edit3, Gamepad2, Percent, Sparkles, Target } from "lucide-react";
import { Navigate } from "react-router-dom";
import { currentSeason, getPlayerStats, getTournamentPodiumsAllTime, type PlayerStats } from "@/lib/playerStats";
import { calcLevel } from "@/lib/xpSystem";
import EditProfileDialog from "@/components/EditProfileDialog";
import AiAvatarDialog from "@/components/AiAvatarDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Perfil() {
  const { isLoggedIn, profile, loading, user, refreshProfile } = useAuth();
  const season = currentSeason();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [totalPodiums, setTotalPodiums] = useState<number>(0);
  const [editOpen, setEditOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [showAllGames, setShowAllGames] = useState(false);

  useEffect(() => {
    if (!user) return;
    getPlayerStats({ userId: user.id }).then(setStats);
    getTournamentPodiumsAllTime({ userId: user.id }).then(setTotalPodiums);
  }, [user]);

  if (loading) return null;
  if (!isLoggedIn) return <Navigate to="/auth" replace />;
  if (!profile) return null;

  const displayName = profile.nickname || profile.full_name || "Jogador";
  const fullName = profile.full_name || displayName;
  const playerXp = profile.experience_points ?? 0;
  const playerLevel = profile.level ?? calcLevel(playerXp);

  async function handleAiAvatarPick(dataUrl: string) {
    if (!user) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const path = `${user.id}/avatar-ai-${Date.now()}.png`;
      const { error } = await supabase.storage.from("avatars").upload(path, blob, {
        upsert: true,
        contentType: "image/png",
      });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
      await supabase.from("public_rankings")
        .update({ avatar_url: data.publicUrl })
        .eq("player_ref_id", user.id).eq("player_type", "user");
      await refreshProfile();
      toast.success("Avatar IA aplicado");
    } catch (e: any) {
      toast.error("Falha: " + (e?.message ?? ""));
    }
  }

  const historyToShow = showAllGames ? (stats?.history ?? []) : (stats?.history ?? []).slice(0, 5);
  const hiddenCount = (stats?.history.length ?? 0) - historyToShow.length;

  return (
    <div className="space-y-5">
      <section className="nexus-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary/60">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayName} />}
              <AvatarFallback className="bg-gradient-gold text-xl font-bold text-primary-foreground">
                {initials(fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold nexus-text-gold">
                <span>{displayName}</span>
                <LevelBadge level={playerLevel} size="md" />
              </h1>
              <p className="text-sm text-muted-foreground">{fullName}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="nexus-chip bg-primary/15 text-primary">Nível {playerLevel}</span>
                <span className="nexus-chip bg-info/15 text-info">XP {playerXp.toLocaleString("pt-BR")}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-primary/30 text-foreground hover:bg-primary/10" onClick={() => setEditOpen(true)}>
              <Edit3 className="h-4 w-4" /> Editar
            </Button>
            <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90" onClick={() => setAiOpen(true)}>
              <Sparkles className="h-4 w-4" /> Avatar IA
            </Button>
          </div>
        </div>
      </section>

      {(() => {
        const winsByProfit = stats?.history.filter((h) => h.profit_loss > 0).length ?? 0;
        const winPct = stats && stats.games > 0 ? Math.round((winsByProfit / stats.games) * 100) : 0;
        const buyRebuy = (stats?.buyIns ?? 0) + (stats?.rebuys ?? 0);
        return (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatCard label="Partidas" value={String(stats?.games ?? 0)} icon={<Gamepad2 className="h-5 w-5" />} tone="info" />
            <StatCard label="% Vitórias" value={`${winPct}%`} icon={<Percent className="h-5 w-5" />} tone="success" />
            <StatCard label="Pódios totais" value={String(totalPodiums)} icon={<Award className="h-5 w-5" />} tone="gold" />
            <StatCard label="Buy-ins + Rebuys" value={String(buyRebuy)} icon={<Coins className="h-5 w-5" />} tone="gold" />
            <StatCard label="KOs" value={String(stats?.kos ?? 0)} icon={<Target className="h-5 w-5" />} tone="destructive" />
          </section>
        );
      })()}
      <section className="nexus-card p-5">
        <h2 className="mb-3 text-lg font-bold">Histórico de partidas</h2>
        {!stats || stats.history.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Você ainda não participou de nenhuma partida.</div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {historyToShow.map((h) => (
                <div key={h.game_id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{h.game_name}</span>
                      <GameTypeBadge type={h.game_type} />
                      {h.position && (
                        <span className="nexus-chip bg-secondary text-[10px] text-muted-foreground">{h.position}º</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(h.date)} · Temporada {h.season_year} · {h.ranking_points} pts
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-muted-foreground">Resultado</div>
                    <div className={`font-bold ${h.profit_loss >= 0 ? "text-success" : "text-destructive"}`}>
                      {h.profit_loss >= 0 ? "+" : ""}{formatBRL(h.profit_loss)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {stats.history.length > 5 && (
              <button
                onClick={() => setShowAllGames((v) => !v)}
                className="mx-auto mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {showAllGames ? (
                  <><ChevronUp className="h-3 w-3" /> Mostrar apenas as últimas 5</>
                ) : (
                  <><ChevronDown className="h-3 w-3" /> Ver todas ({hiddenCount} ocultas)</>
                )}
              </button>
            )}
          </>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <LevelProgressCard experiencePoints={playerXp} level={playerLevel} />
        <AchievementsCard
          achievementsUnlocked={profile.achievements_unlocked ?? []}
          achievementsRrCount={profile.achievements_rr_count ?? {}}
          achievementsRrProgress={profile.achievements_rr_progress ?? {}}
          achievementsSeasonal={profile.achievements_seasonal ?? {}}
        />
      </section>

      <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} />
      <AiAvatarDialog open={aiOpen} onOpenChange={setAiOpen} onPick={handleAiAvatarPick} />
    </div>
  );
}
