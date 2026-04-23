import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Award,
  Trophy,
  Target,
  Crown,
  Gamepad2,
  Zap,
  Repeat2,
  Shield,
  Flame,
  ChevronDown,
  ChevronUp,
  HeartHandshake,
} from "lucide-react";
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

const COLOR_MAP: Record<string, string> = {
  aprendiz: "bg-info/15 text-info border-info/30",
  engajado: "bg-info/15 text-info border-info/30",
  veterano: "bg-[hsl(25_70%_45%/0.18)] text-[hsl(25_95%_70%)] border-[hsl(25_70%_45%/0.4)]",
  vencedor_rr: "bg-primary/15 text-primary border-primary/30",
  cashman_rr: "bg-success/15 text-success border-success/30",
  soberano_rr: "bg-destructive/15 text-destructive border-destructive/30",
  btb_champion_rr: "bg-[hsl(346_77%_55%/0.18)] text-[hsl(346_77%_70%)] border-[hsl(346_77%_55%/0.35)]",
  sprinter_rr: "bg-[hsl(190_85%_50%/0.18)] text-[hsl(190_85%_65%)] border-[hsl(190_85%_50%/0.35)]",
  consistente_rr: "bg-success/15 text-success border-success/30",
};

interface Props {
  achievementsUnlocked: string[];
  achievementsRrCount: Record<string, number>;
  achievementsRrProgress: Record<string, number>;
  achievementsSeasonal: Record<string, number[]>;
}

export default function AchievementsCard({
  achievementsUnlocked,
  achievementsRrCount,
  achievementsRrProgress,
  achievementsSeasonal,
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const unlocked = new Set(achievementsUnlocked || []);
  const rrCount = achievementsRrCount || {};
  const rrProgress = achievementsRrProgress || {};
  const seasonal = achievementsSeasonal || {};

  const allAchievements = Object.entries(ACHIEVEMENT_DEFINITIONS).map(([id, def]) => {
    const Icon = ICON_MAP[id] || Award;
    const color = COLOR_MAP[id] || "bg-secondary text-muted-foreground border-border";
    let isUnlocked = false;
    let countLabel: string | null = null;
    let progressLabel: string | null = null;
    let subLabel: string | null = null;

    if (def.type === "unique") {
      isUnlocked = unlocked.has(id);
    } else if (def.type === "rr") {
      const count = rrCount[id] || 0;
      const progress = rrProgress[id] || 0;
      isUnlocked = count > 0;
      if (count > 0) countLabel = `x${count}`;
      if (def.threshold) {
        progressLabel = `Progresso atual: ${progress % def.threshold}/${def.threshold}`;
      }
    } else if (def.type === "seasonal") {
      const years = seasonal[id] || [];
      isUnlocked = years.length > 0;
      if (years.length > 0) {
        countLabel = `x${years.length}`;
        subLabel = years.join(", ");
      }
    }

    return { id, def, Icon, color, isUnlocked, countLabel, progressLabel, subLabel };
  });

  const unlockedList = allAchievements.filter((a) => a.isUnlocked);
  const lockedList = allAchievements.filter((a) => !a.isUnlocked);
  const lockedToShow = showAll ? lockedList : lockedList.slice(0, 3);

  return (
    <Card className="border border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="h-5 w-5 text-primary" />
          Conquistas
          <Badge variant="outline" className="border-primary/30 text-xs text-primary">
            {unlockedList.length}/{allAchievements.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {unlockedList.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-success">Desbloqueadas</h4>
            {unlockedList.map(
              ({ id, def, Icon, color, countLabel, progressLabel, subLabel }) => (
                <div key={id} className={`rounded-lg border p-3 ${color}`}>
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{def.name}</p>
                        {countLabel && (
                          <span className="flex items-center gap-1 rounded-full bg-foreground/10 px-1.5 py-0.5 text-xs font-bold">
                            <Repeat2 className="h-3 w-3" />
                            {countLabel}
                          </span>
                        )}
                        <span className="text-xs opacity-70">
                          +{def.xp.toLocaleString("pt-BR")} XP{def.type === "rr" ? " cada" : ""}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs opacity-80">{def.description}</p>
                      {subLabel && (
                        <p className="mt-0.5 text-xs font-medium opacity-70">{subLabel}</p>
                      )}
                      {progressLabel && def.type === "rr" && (
                        <p className="mt-0.5 text-xs opacity-60">{progressLabel}</p>
                      )}
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        )}

        {lockedList.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">A desbloquear</h4>
            {lockedToShow.map(({ id, def, Icon, progressLabel }) => (
              <div
                key={id}
                className="rounded-lg border border-border/60 bg-secondary/30 p-3 opacity-70"
              >
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-muted-foreground">{def.name}</p>
                      {def.type === "rr" && (
                        <span className="text-xs text-muted-foreground/70">repetível</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground/90">{def.description}</p>
                    {progressLabel && (
                      <p className="mt-0.5 text-xs text-muted-foreground/70">{progressLabel}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {lockedList.length > 3 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="mx-auto flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Mostrar menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> Ver mais ({lockedList.length - 3})
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {unlockedList.length === 0 && (
          <div className="py-4 text-center">
            <Award className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              Jogue partidas para desbloquear conquistas!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
