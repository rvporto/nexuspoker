import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBRL, initials } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  player_ref_id: string;
  player_type: "user" | "temp";
  player_nickname: string;
  avatar_url: string | null;
  position: number;
  total_points: number;
  total_profit: number;
  games_played: number;
  wins: number;
  kos: number;
  buy_ins: number;
  rebuys: number;
  season_year: number;
};

type SortKey = "position" | "nickname" | "games" | "wins" | "kos" | "entries" | "profit" | "avgPoints";
type SortDir = "asc" | "desc";

const entries = (r: Row) => r.buy_ins + r.rebuys;
const avgPoints = (r: Row) => r.total_points / Math.max(1, r.games_played);

export default function Estatisticas() {
  const { isAdmin, loading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [seasons, setSeasons] = useState<number[]>([]);
  const [season, setSeason] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("position");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    (async () => {
      const { data: rk } = await supabase.from("public_rankings").select("*");
      const all = (rk ?? []) as Row[];
      const ys = Array.from(new Set(all.map((r) => r.season_year)));
      if (ys.length === 0) ys.push(new Date().getFullYear());
      ys.sort((a, b) => b - a);
      setSeasons(ys);
      setRows(all);
      const [{ count: p }, { count: t }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("temporary_players").select("*", { count: "exact", head: true }),
      ]);
      setTotalPlayers((p ?? 0) + (t ?? 0));
    })();
  }, []);

  useEffect(() => {
    if (season === null && seasons.length > 0) setSeason(seasons[0]);
  }, [seasons, season]);

  const seasonRows = useMemo(() => rows.filter((r) => r.season_year === season), [rows, season]);
  const showPoints = (season ?? 0) >= 2026;

  const sortedRows = useMemo(() => {
    const getVal = (r: Row): number | string => {
      switch (sortKey) {
        case "position": return r.position;
        case "nickname": return r.player_nickname.toLowerCase();
        case "games": return r.games_played;
        case "wins": return r.wins;
        case "kos": return r.kos;
        case "entries": return entries(r);
        case "profit": return r.total_profit;
        case "avgPoints": return avgPoints(r);
      }
    };
    return [...seasonRows].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  }, [seasonRows, sortKey, sortDir]);

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "nickname" || key === "position" ? "asc" : "desc"); }
  };

  const SortHeader = ({ label, k, align = "right" }: { label: string; k: SortKey; align?: "left" | "right" }) => {
    const active = sortKey === k;
    const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th className={cn("p-3 select-none", align === "right" ? "text-right" : "text-left")}>
        <button
          onClick={() => toggleSort(k)}
          className={cn("inline-flex items-center gap-1 transition-colors hover:text-primary",
            align === "right" && "flex-row-reverse", active && "text-primary")}
        >
          <span>{label}</span>
          <Icon className="h-3 w-3 opacity-70" />
        </button>
      </th>
    );
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold nexus-text-gold">Estatísticas</h1>
        <p className="text-sm text-muted-foreground">Visão administrativa da temporada.</p>
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

      {seasonRows.length === 0 ? (
        <div className="nexus-card p-10 text-center text-sm text-muted-foreground">
          Nenhum dado de ranking nesta temporada. Finalize partidas e recalcule o ranking.
        </div>
      ) : (
        <div className="nexus-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <SortHeader label="#" k="position" align="left" />
                <SortHeader label="Jogador" k="nickname" align="left" />
                <SortHeader label="Partidas" k="games" />
                <SortHeader label="Vitórias" k="wins" />
                <SortHeader label="KOs" k="kos" />
                <SortHeader label="Entradas" k="entries" />
                <SortHeader label="Lucro" k="profit" />
                {showPoints && <SortHeader label="Méd. pts/etapa" k="avgPoints" />}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => (
                <tr key={r.id} className="border-b border-border/60">
                  <td className="p-3 text-muted-foreground">{r.position}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        {r.avatar_url && <AvatarImage src={r.avatar_url} alt={r.player_nickname} />}
                        <AvatarFallback className="bg-secondary text-[10px]">{initials(r.player_nickname)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{r.player_nickname}</span>
                      {r.player_type === "temp" && (
                        <span className="nexus-chip bg-secondary text-[10px] text-muted-foreground">Temp</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right">{r.games_played}</td>
                  <td className="p-3 text-right">{r.wins}</td>
                  <td className="p-3 text-right">{r.kos}</td>
                  <td className="p-3 text-right">
                    <div className="flex flex-col items-end leading-tight">
                      <span className="font-semibold">{entries(r)}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {r.buy_ins} BI · {r.rebuys} RB
                      </span>
                    </div>
                  </td>
                  <td className={`p-3 text-right font-semibold ${r.total_profit >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatBRL(r.total_profit)}
                  </td>
                  {showPoints && (
                    <td className="p-3 text-right text-primary font-semibold">
                      {avgPoints(r).toFixed(1)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Total de jogadores cadastrados (users + temporários): {totalPlayers}
      </p>
    </div>
  );
}
