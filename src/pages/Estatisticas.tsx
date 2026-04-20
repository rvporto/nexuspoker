import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockPlayers, mockRanking2025, mockRanking2026 } from "@/data/mockData";
import { formatBRL, initials } from "@/lib/format";
import { useMockAuth } from "@/context/MockAuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Estatisticas() {
  const { role } = useMockAuth();
  const [season, setSeason] = useState<2025 | 2026>(2026);
  if (role !== "admin") return <Navigate to="/" replace />;
  const rows = season === 2026 ? mockRanking2026 : mockRanking2025;
  const showPoints = season >= 2026;

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
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Jogador</th>
              <th className="p-3 text-right">Partidas</th>
              <th className="p-3 text-right">Vitórias</th>
              <th className="p-3 text-right">KOs</th>
              <th className="p-3 text-right">Lucro</th>
              {showPoints && <th className="p-3 text-right">Méd. pts/etapa</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
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
                <td className={`p-3 text-right font-semibold ${r.profit >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatBRL(r.profit)}
                </td>
                {showPoints && (
                  <td className="p-3 text-right text-primary font-semibold">
                    {(r.points / Math.max(1, r.games)).toFixed(1)}
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
