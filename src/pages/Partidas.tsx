import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GameTypeBadge from "@/components/GameTypeBadge";
import { mockGames } from "@/data/mockData";
import { formatBRL, formatDateTime } from "@/lib/format";
import { Plus, Search, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Partidas() {
  const { isAdmin } = useAuth();
  const seasons = useMemo(() => Array.from(new Set(mockGames.map((g) => g.seasonYear))).sort((a, b) => b - a), []);
  const [season, setSeason] = useState<number>(seasons[0]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "tournament" | "cash">("all");

  const filtered = mockGames.filter(
    (g) =>
      g.seasonYear === season &&
      (filter === "all" || g.type === filter) &&
      g.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold nexus-text-gold">Partidas</h1>
          <p className="text-sm text-muted-foreground">Histórico completo de torneios e cash games.</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => toast.info("Modal de nova partida — disponível após a Fase 2.")}
            className="bg-gradient-gold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Nova Partida
          </Button>
        )}
      </header>

      <Tabs value={String(season)} onValueChange={(v) => setSeason(Number(v))}>
        <TabsList className="bg-secondary">
          {seasons.map((s) => (
            <TabsTrigger key={s} value={String(s)}>
              Temporada {s}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar partidas..."
            className="pl-9"
          />
        </div>
        <div className="flex rounded-lg border border-border bg-secondary p-1 text-sm">
          {(["all", "tournament", "cash"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                filter === v ? "bg-background text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "all" ? "Todas" : v === "tournament" ? "Torneios" : "Cash"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="nexus-card p-10 text-center text-sm text-muted-foreground">Nenhuma partida encontrada.</div>
        )}
        {filtered.map((g) => (
          <div
            key={g.id}
            className="nexus-card nexus-hover-gold flex cursor-pointer flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            onClick={() => toast.info("Detalhes da partida — disponível após a Fase 2.")}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-semibold">{g.name}</h3>
                <GameTypeBadge type={g.type} />
                {g.status === "scheduled" && (
                  <span className="nexus-chip bg-info/15 text-info">Agendada</span>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(g.date)} · Buy-in {formatBRL(g.buyIn)} · Rebuy {formatBRL(g.rebuyValue)}
              </div>
            </div>
            <div className="flex items-center gap-5 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" /> {g.players}
              </div>
              <div className="text-right">
                <div className="text-[11px] text-muted-foreground">Pote</div>
                <div className="font-bold text-primary">{formatBRL(g.totalPot)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
