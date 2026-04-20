import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import RankMovementBadge from "@/components/RankMovementBadge";
import { mockRanking2025, mockRanking2026 } from "@/data/mockData";
import { formatBRL, initials } from "@/lib/format";
import { AlertTriangle, Crown, FileDown, LinkIcon, RefreshCw, UserCheck } from "lucide-react";
import { useMockAuth } from "@/context/MockAuthContext";
import { toast } from "sonner";

export default function Ranking() {
  const { role, isLoggedIn } = useMockAuth();
  const isAdmin = role === "admin";
  const [season, setSeason] = useState<2025 | 2026>(2026);
  const [filter, setFilter] = useState<"all" | "tournament" | "cash">("all");

  const rows = season === 2026 ? mockRanking2026 : mockRanking2025;
  const metric = season >= 2026 ? "points" : "profit";
  const podium = useMemo(() => rows.slice(0, 3), [rows]);
  const rest = rows.slice(3);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold nexus-text-gold">Ranking</h1>
        <p className="text-sm text-muted-foreground">
          {season >= 2026
            ? "Sistema de pontos: PBT × FM + KO para torneios e PBC × FP + 5 + KO para cash games."
            : "Temporada legada — classificação por lucro total acumulado (cash + torneio)."}
        </p>
      </header>

      {isAdmin && (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="nexus-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><RefreshCw className="h-4 w-4 text-primary" /> Atualizar ranking</div>
            <p className="text-xs text-muted-foreground">Recalcula posições com base nas partidas finalizadas da temporada.</p>
            <Button size="sm" variant="outline" className="mt-3 border-primary/40 text-primary hover:bg-primary/10" onClick={() => toast.info("Disponível após a Fase 2.")}>
              Recalcular agora
            </Button>
          </div>
          <div className="nexus-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><LinkIcon className="h-4 w-4 text-primary" /> Vínculos pendentes</div>
            <p className="text-xs text-muted-foreground">Nenhum pedido no momento.</p>
            <Button size="sm" variant="outline" className="mt-3 border-primary/40 text-primary hover:bg-primary/10" onClick={() => toast.info("Disponível após a Fase 2.")}>
              Gerenciar vínculos
            </Button>
          </div>
          <div className="nexus-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive"><AlertTriangle className="h-4 w-4" /> Zona de perigo</div>
            <p className="text-xs text-muted-foreground">Reset completo do ranking da temporada.</p>
            <Button size="sm" variant="outline" className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => toast.info("Disponível após a Fase 2.")}>
              Resetar ranking
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={String(season)} onValueChange={(v) => setSeason(Number(v) as 2025 | 2026)}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="2026">Temporada 2026</TabsTrigger>
            <TabsTrigger value="2025">Temporada 2025</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-secondary p-1 text-sm">
            {(["all", "tournament", "cash"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`rounded-md px-3 py-1.5 ${
                  filter === v ? "bg-background text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "all" ? "Geral" : v === "tournament" ? "Torneios" : "Cash"}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" className="border-primary/30 text-foreground hover:bg-primary/10" onClick={() => toast.info("Relatório JPEG — Fase 4.")}>
            <FileDown className="h-4 w-4" /> Relatório
          </Button>
        </div>
      </div>

      {/* Podium */}
      <section className="nexus-card p-5">
        <div className="mb-4 flex items-center gap-2"><Crown className="h-5 w-5 text-primary" /><h2 className="text-lg font-bold">Pódio</h2></div>
        <div className="grid grid-cols-3 items-end gap-3">
          {[podium[1], podium[0], podium[2]].filter(Boolean).map((row, idx) => {
            const place = idx === 1 ? 1 : idx === 0 ? 2 : 3;
            const heights = ["h-24", "h-32", "h-20"];
            return (
              <div key={row.player.id} className="flex flex-col items-center gap-2">
                <Avatar className="h-14 w-14 border-2 border-primary/60">
                  <AvatarFallback className="bg-secondary">{initials(row.player.nickname)}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <div className="text-sm font-semibold max-w-[120px] truncate">{row.player.nickname}</div>
                  <div className="text-xs text-primary font-bold">
                    {metric === "points" ? `${row.points} pts` : formatBRL(row.profit)}
                  </div>
                </div>
                <div className={`${heights[idx]} w-full rounded-t-lg bg-gradient-gold flex items-start justify-center pt-2`}>
                  <span className="text-base font-bold text-primary-foreground">{place}º</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Full list */}
      <section className="nexus-card divide-y divide-border">
        {rest.map((row) => {
          const isTemp = row.player.isTemporary;
          return (
            <div key={row.player.id} className="flex items-center gap-3 p-4">
              <div className="flex w-14 items-center gap-2">
                <span className="text-lg font-bold text-muted-foreground">{row.position}º</span>
                <RankMovementBadge current={row.position} previous={row.prevPosition} />
              </div>
              <Avatar className="h-10 w-10 border border-border">
                <AvatarFallback className="bg-secondary">{initials(row.player.nickname)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{row.player.nickname}</span>
                  {isTemp && <span className="nexus-chip bg-secondary text-[10px] text-muted-foreground">Temporário</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {row.games} partidas · {row.wins} vitórias · {row.kos} KOs
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-primary">
                  {metric === "points" ? `${row.points} pts` : formatBRL(row.profit)}
                </div>
                {metric === "points" && (
                  <div className={`text-xs ${row.profit >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatBRL(row.profit)}
                  </div>
                )}
              </div>
              {isTemp && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-primary/40 text-primary hover:bg-primary/10"
                  onClick={() =>
                    toast.info(
                      isAdmin
                        ? "Vincular a conta existente — Fase 3."
                        : isLoggedIn
                          ? "Solicitação de vínculo enviada (preview)."
                          : "Faça login para solicitar vínculo.",
                    )
                  }
                >
                  {isAdmin ? (
                    <><LinkIcon className="h-3 w-3" /> Vincular</>
                  ) : (
                    <><UserCheck className="h-3 w-3" /> Solicitar</>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
