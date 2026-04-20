import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GameTypeBadge from "@/components/GameTypeBadge";
import { formatBRL, formatDateTime } from "@/lib/format";
import { Plus, Search, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import CreateGameModal from "@/components/CreateGameModal";
import GameDetailsModal from "@/components/GameDetailsModal";

type Game = {
  id: string;
  name: string;
  type: "tournament" | "cash";
  date: string;
  season_year: number;
  buy_in: number;
  rebuy_value: number;
  status: "scheduled" | "finished";
  total_pot: number;
  player_count?: number;
};

export default function Partidas() {
  const { isAdmin } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "tournament" | "cash">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: gameRows } = await supabase
      .from("games")
      .select("id, name, type, date, season_year, buy_in, rebuy_value, status, total_pot")
      .order("date", { ascending: false });

    const { data: counts } = await supabase
      .from("game_participations")
      .select("game_id");

    const countMap = new Map<string, number>();
    (counts ?? []).forEach((row) => {
      countMap.set(row.game_id, (countMap.get(row.game_id) ?? 0) + 1);
    });

    const enriched = (gameRows ?? []).map((g) => ({
      ...g,
      player_count: countMap.get(g.id) ?? 0,
    })) as Game[];
    setGames(enriched);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const seasons = useMemo(() => {
    const ys = Array.from(new Set(games.map((g) => g.season_year))).sort((a, b) => b - a);
    if (ys.length === 0) ys.push(new Date().getFullYear());
    return ys;
  }, [games]);

  useEffect(() => {
    if (season === null && seasons.length > 0) setSeason(seasons[0]);
  }, [seasons, season]);

  const filtered = games.filter(
    (g) =>
      g.season_year === season &&
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
            onClick={() => setCreateOpen(true)}
            className="bg-gradient-gold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Nova Partida
          </Button>
        )}
      </header>

      {seasons.length > 0 && season !== null && (
        <Tabs value={String(season)} onValueChange={(v) => setSeason(Number(v))}>
          <TabsList className="bg-secondary">
            {seasons.map((s) => (
              <TabsTrigger key={s} value={String(s)}>Temporada {s}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar partidas..." className="pl-9" />
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
        {loading && (
          <div className="nexus-card p-10 text-center text-sm text-muted-foreground">Carregando...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="nexus-card p-10 text-center text-sm text-muted-foreground">
            Nenhuma partida encontrada.{isAdmin && " Clique em \"Nova Partida\" para começar."}
          </div>
        )}
        {filtered.map((g) => (
          <button
            key={g.id}
            className="nexus-card nexus-hover-gold flex w-full cursor-pointer flex-col gap-3 p-4 text-left sm:flex-row sm:items-center sm:justify-between"
            onClick={() => setDetailsId(g.id)}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-semibold">{g.name}</h3>
                <GameTypeBadge type={g.type} />
                {g.status === "scheduled" ? (
                  <span className="nexus-chip bg-info/15 text-info">Agendada</span>
                ) : (
                  <span className="nexus-chip bg-success/15 text-success">Finalizada</span>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(g.date)} · Buy-in {formatBRL(g.buy_in)} · Rebuy {formatBRL(g.rebuy_value)}
              </div>
            </div>
            <div className="flex items-center gap-5 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" /> {g.player_count}
              </div>
              <div className="text-right">
                <div className="text-[11px] text-muted-foreground">Pote</div>
                <div className="font-bold text-primary">{formatBRL(g.total_pot)}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <CreateGameModal open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />
      <GameDetailsModal open={!!detailsId} onOpenChange={(o) => !o && setDetailsId(null)} gameId={detailsId} onChanged={load} />
    </div>
  );
}
