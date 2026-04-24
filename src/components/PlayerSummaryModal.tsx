import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, Crown, Flame, Gamepad2, HeartHandshake, Percent, Repeat2, Shield, Swords, Target, Trophy, Zap } from "lucide-react";
import LevelBadge from "./LevelBadge";
import { initials } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { getLifetimeSummary, type LifetimeSummary } from "@/lib/playerStats";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/xpSystem";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  aprendiz: Gamepad2,
  engajado: HeartHandshake,
  veterano: Shield,
  vencedor_rr: Trophy,
  cashman_rr: Crown,
  soberano_rr: Award,
  btb_champion_rr: Flame,
  sprinter_rr: Zap,
  consistente_rr: Target,
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  player: {
    type: "user" | "temp";
    refId: string;
    nickname: string;
    avatar_url: string | null;
  } | null;
};

export default function PlayerSummaryModal({ open, onOpenChange, player }: Props) {
  const [summary, setSummary] = useState<LifetimeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<{
    level: number;
    achievements_unlocked: string[];
    achievements_rr_count: Record<string, number>;
    achievements_seasonal: Record<string, number[]>;
  } | null>(null);

  useEffect(() => {
    if (!open || !player) return;
    setSummary(null);
    setProfile(null);
    setLoading(true);
    (async () => {
      const summ = await getLifetimeSummary(
        player.type === "user"
          ? { userId: player.refId }
          : { tempPlayerId: player.refId },
      );
      setSummary(summ);
      if (player.type === "user") {
        const { data } = await supabase
          .from("profiles")
          .select("level, achievements_unlocked, achievements_rr_count, achievements_seasonal")
          .eq("id", player.refId)
          .maybeSingle();
        if (data) {
          setProfile({
            level: (data as any).level ?? 1,
            achievements_unlocked: (data as any).achievements_unlocked ?? [],
            achievements_rr_count: (data as any).achievements_rr_count ?? {},
            achievements_seasonal: (data as any).achievements_seasonal ?? {},
          });
        }
      }
      setLoading(false);
    })();
  }, [open, player]);

  // Sprints vencidos (rr)
  const sprintsWon = profile?.achievements_rr_count?.sprinter_rr ?? 0;

  // Lista achievements desbloqueados
  const achievementsList = profile
    ? Object.entries(ACHIEVEMENT_DEFINITIONS)
        .map(([id, def]) => {
          const Icon = ICON_MAP[id] || Award;
          let unlocked = false;
          let count = 0;
          let years: number[] = [];
          if (def.type === "unique") unlocked = profile.achievements_unlocked.includes(id);
          else if (def.type === "rr") {
            count = profile.achievements_rr_count[id] ?? 0;
            unlocked = count > 0;
          } else if (def.type === "seasonal") {
            years = profile.achievements_seasonal[id] ?? [];
            unlocked = years.length > 0;
          }
          return { id, def, Icon, unlocked, count, years };
        })
        .filter((a) => a.unlocked)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="nexus-text-gold">Resumo do Jogador</DialogTitle>
        </DialogHeader>

        {!player ? null : (
          <>
            {/* Header jogador */}
            <div className="flex items-center gap-3">
              <Avatar className="h-16 w-16 border-2 border-primary/60">
                {player.avatar_url && <AvatarImage src={player.avatar_url} alt={player.nickname} />}
                <AvatarFallback className="bg-gradient-gold text-base font-bold text-primary-foreground">
                  {initials(player.nickname)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-lg font-bold">{player.nickname}</h3>
                  {profile && <LevelBadge level={profile.level} size="md" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  Estatísticas agregadas de todas as temporadas
                </p>
              </div>
            </div>

            {/* Stats */}
            {loading || !summary ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <SummaryTile label="Partidas totais" value={summary.totalGames} icon={<Swords className="h-4 w-4" />} tone="info" />
                <SummaryTile label="% Vitórias" value={`${summary.winRatePct}%`} icon={<Percent className="h-4 w-4" />} tone="success" />
                <SummaryTile label="Cash Games" value={summary.cashGames} icon={<Gamepad2 className="h-4 w-4" />} tone="cash" />
                <SummaryTile label="Torneios" value={summary.tournamentGames} icon={<Trophy className="h-4 w-4" />} tone="tournament" />
                <SummaryTile label="Pódios em torneio" value={summary.tournamentPodiums} icon={<Award className="h-4 w-4" />} tone="gold" />
                <SummaryTile label="Sprints vencidos" value={sprintsWon} icon={<Zap className="h-4 w-4" />} tone="info" />
              </div>
            )}

            {/* Conquistas */}
            {profile && (
              <div className="rounded-xl border border-primary/20 bg-card p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-bold">Conquistas desbloqueadas</h4>
                  <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {achievementsList.length}/{Object.keys(ACHIEVEMENT_DEFINITIONS).length}
                  </span>
                </div>
                {achievementsList.length === 0 ? (
                  <p className="py-3 text-center text-xs text-muted-foreground">
                    Nenhuma conquista desbloqueada ainda.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {achievementsList.map(({ id, def, Icon, count, years }) => (
                      <div
                        key={id}
                        className="flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/30 p-2"
                      >
                        <Icon className="mt-0.5 h-4 w-4 text-primary" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold">{def.name}</span>
                            {count > 0 && (
                              <span className="flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                                <Repeat2 className="h-2.5 w-2.5" />x{count}
                              </span>
                            )}
                            {years.length > 0 && (
                              <span className="text-[9px] font-bold text-primary">
                                {years.join(", ")}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">{def.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {player.type === "temp" && (
              <p className="text-center text-[11px] text-muted-foreground">
                Jogador temporário — sem nível ou conquistas registradas.
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const TONE: Record<string, string> = {
  info: "bg-info/15 text-info",
  success: "bg-success/15 text-success",
  cash: "bg-[hsl(265_70%_62%/0.15)] text-[hsl(265_80%_75%)]",
  tournament: "bg-[hsl(25_95%_55%/0.15)] text-[hsl(25_95%_70%)]",
  gold: "bg-primary/15 text-primary",
};

function SummaryTile({
  label,
  value,
  icon,
  tone = "info",
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone?: keyof typeof TONE | string;
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={`flex h-6 w-6 items-center justify-center rounded-md ${TONE[tone] ?? TONE.info}`}>
          {icon}
        </span>
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}
