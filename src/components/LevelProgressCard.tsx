import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Star, Zap } from "lucide-react";
import {
  XP_PER_LEVEL,
  calcLevel,
  xpProgressPercent,
  getLevelTitle,
} from "@/lib/xpSystem";

interface Props {
  experiencePoints: number;
  level?: number;
}

export default function LevelProgressCard({ experiencePoints, level }: Props) {
  const xp = experiencePoints || 0;
  const lvl = level || calcLevel(xp);
  const xpInLevel = xp % XP_PER_LEVEL;
  const progressPct = xpProgressPercent(xp);
  const xpNeeded = XP_PER_LEVEL - xpInLevel;

  return (
    <Card className="border border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Star className="h-5 w-5 text-primary" />
          Progresso de Nível
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-gold">
            <span className="text-2xl font-bold text-primary-foreground">{lvl}</span>
          </div>
          <h3 className="text-lg font-semibold">Nível {lvl}</h3>
          <p className="text-sm text-muted-foreground">{getLevelTitle(lvl)}</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">
              {xpInLevel.toLocaleString("pt-BR")} / {XP_PER_LEVEL.toLocaleString("pt-BR")} XP
            </span>
          </div>
          <Progress value={progressPct} className="h-3" />
          <p className="text-center text-xs text-muted-foreground">
            Faltam{" "}
            <span className="font-semibold text-primary">
              {xpNeeded.toLocaleString("pt-BR")} XP
            </span>{" "}
            para o nível {lvl + 1}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="rounded-lg bg-secondary/60 p-2">
            <p className="text-muted-foreground">XP Total</p>
            <p className="font-bold text-primary">{xp.toLocaleString("pt-BR")}</p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-2">
            <p className="text-muted-foreground">Nível Atual</p>
            <p className="font-bold">{lvl}</p>
          </div>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
          <div className="mb-1 flex items-center gap-2 text-primary">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">Como ganhar XP</span>
          </div>
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            <li>+100 XP por partida jogada</li>
            <li>+200 XP lucro em cash game</li>
            <li>+300 XP top 3 em torneio</li>
            <li>+10 XP por cada KO</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
