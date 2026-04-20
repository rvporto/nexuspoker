import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockPlayers, mockRanking2025, mockRanking2026, type MockRankingRow } from "@/data/mockData";
import { formatBRL, initials } from "@/lib/format";
import { useMockAuth } from "@/context/MockAuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "position" | "nickname" | "games" | "wins" | "kos" | "entries" | "profit" | "avgPoints";
type SortDir = "asc" | "desc";

const entries = (r: MockRankingRow) => r.buyIns + r.rebuys;
const avgPoints = (r: MockRankingRow) => r.points / Math.max(1, r.games);

export default function Estatisticas() {
  const { role } = useMockAuth();
  const [season, setSeason] = useState<2025 | 2026>(2026);
  const [sortKey, setSortKey] = useState<SortKey>("position");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rows = season === 2026 ? mockRanking2026 : mockRanking2025;
  const showPoints = season >= 2026;

  const sortedRows = useMemo(() => {
    const getVal = (r: MockRankingRow): number | string => {
      switch (sortKey) {
        case "position": return r.position;
        case "nickname": return r.player.nickname.toLowerCase();
        case "games": return r.games;
        case "wins": return r.wins;
        case "kos": return r.kos;
        case "entries": return entries(r);
        case "profit": return r.profit;
        case "avgPoints": return avgPoints(r);
      }
    };
    return [...rows].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  }, [rows, sortKey, sortDir]);

  if (role !== "admin") return <Navigate to="/" replace />;


  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // números começam desc (maior primeiro), textos asc
      setSortDir(key === "nickname" || key === "position" ? "asc" : "desc");
    }
  };

  const SortHeader = ({
    label,
    k,
    align = "right",
    className,
  }: {
    label: string;
    k: SortKey;
    align?: "left" | "right";
    className?: string;
  }) => {
    const active = sortKey === k;
    const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th className={cn("p-3 select-none", align === "right" ? "text-right" : "text-left", className)}>
        <button
          onClick={() => toggleSort(k)}
          className={cn(
            "inline-flex items-center gap-1 transition-colors hover:text-primary",
            align === "right" && "flex-row-reverse",
            active && "text-primary",
          )}
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

      <Tabs value={String(season)} onValueChange={(v) => setSeason(Number(v) as 2025 | 2026)}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="2026">2026</TabsTrigger>
          <TabsTrigger value="2025">2025</TabsTrigger>
        </TabsList>
      </Tabs>

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
              <tr key={r.player.id} className="border-b border-border/60">
                <td className="p-3 text-muted-foreground">{r.position}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-secondary text-[10px]">{initials(r.player.nickname)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{r.player.nickname}</span>
                    {r.player.isTemporary && (
                      <span className="nexus-chip bg-secondary text-[10px] text-muted-foreground">Temp</span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-right">{r.games}</td>
                <td className="p-3 text-right">{r.wins}</td>
                <td className="p-3 text-right">{r.kos}</td>
                <td className="p-3 text-right">
                  <div className="flex flex-col items-end leading-tight">
                    <span className="font-semibold">{entries(r)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {r.buyIns} BI · {r.rebuys} RB
                    </span>
                  </div>
                </td>
                <td className={`p-3 text-right font-semibold ${r.profit >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatBRL(r.profit)}
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

      <p className="text-xs text-muted-foreground">
        Total de jogadores cadastrados (users + temporários): {mockPlayers.length}
      </p>
    </div>
  );
}
