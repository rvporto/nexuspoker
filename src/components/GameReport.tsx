import { forwardRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatBRL, formatDateTime, initials } from "@/lib/format";
import { Crown, Trophy } from "lucide-react";

export type GameReportRow = {
  id: string;
  player_nickname: string;
  avatar_url: string | null;
  position: number | null;
  entries: number;
  rebuys: number;
  ko_points: number;
  final_amount: number;
  profit_loss: number;
  ranking_points: number;
};

interface Props {
  game: {
    name: string;
    type: "tournament" | "cash";
    date: string;
    season_year: number;
    buy_in: number;
    rebuy_value: number;
    total_pot: number;
  };
  rows: GameReportRow[];
}

const GameReport = forwardRef<HTMLDivElement, Props>(({ game, rows }, ref) => {
  const useProfit = game.season_year < 2026;
  // Ordena pela métrica relevante
  const sorted = [...rows].sort((a, b) => {
    if (useProfit) return b.profit_loss - a.profit_loss;
    return b.ranking_points - a.ranking_points;
  });
  const podium = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <div
      ref={ref}
      style={{
        width: 1200,
        minHeight: 1500,
        background: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "40px 48px",
          background:
            "linear-gradient(135deg, hsl(var(--background-mid)) 0%, hsl(var(--background)) 100%)",
          borderBottom: "2px solid hsl(var(--primary) / 0.4)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
              Nexus Poker House
            </div>
            <h1 className="mt-2 text-4xl font-extrabold nexus-text-gold">
              {game.name}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase">
                {game.type === "tournament" ? "Torneio" : "Cash Game"}
              </span>
              <span>{formatDateTime(game.date)}</span>
              <span>· Temporada {game.season_year}</span>
            </div>
          </div>
          <div className="text-right">
            <Crown className="ml-auto h-12 w-12 text-primary" />
            <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
              Critério de classificação
            </div>
            <div className="text-sm font-bold text-primary">
              {useProfit ? "Lucro (R$)" : "Pontos do Regulamento"}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-3">
          <Stat label="Buy-in" value={formatBRL(game.buy_in)} />
          <Stat label="Rebuy" value={formatBRL(game.rebuy_value)} />
          <Stat label="Jogadores" value={String(rows.length)} />
          <Stat label="Pote" value={formatBRL(game.total_pot)} />
        </div>
      </div>

      {/* Pódio */}
      {podium.length > 0 && (
        <div className="px-12 py-10">
          <h2 className="mb-6 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Pódio da Partida
          </h2>
          <div className="grid grid-cols-3 items-end gap-6">
            {[podium[1], podium[0], podium[2]].filter(Boolean).map((p, idx) => {
              const place = idx === 1 ? 1 : idx === 0 ? 2 : 3;
              const heights = [180, 240, 140];
              return (
                <div key={p.id} className="flex flex-col items-center gap-3">
                  <Avatar
                    className={`border-4 ${place === 1 ? "h-28 w-28 border-primary" : "h-20 w-20 border-border"}`}
                  >
                    {p.avatar_url && (
                      <AvatarImage src={p.avatar_url} alt={p.player_nickname} />
                    )}
                    <AvatarFallback className="bg-secondary text-2xl">
                      {initials(p.player_nickname)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <div className="text-2xl font-extrabold">{p.player_nickname}</div>
                    <div
                      className={`mt-1 text-2xl font-extrabold ${
                        useProfit && p.profit_loss >= 0
                          ? "text-success"
                          : useProfit
                            ? "text-destructive"
                            : "text-primary"
                      }`}
                    >
                      {useProfit ? formatBRL(p.profit_loss) : `${p.ranking_points} pts`}
                    </div>
                  </div>
                  <div
                    style={{
                      height: heights[idx],
                      background:
                        place === 1
                          ? "linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.6) 100%)"
                          : "linear-gradient(180deg, hsl(var(--secondary)) 0%, hsl(var(--background-mid)) 100%)",
                    }}
                    className="flex w-full items-start justify-center rounded-t-2xl pt-3"
                  >
                    <div
                      className={`flex items-center gap-2 text-3xl font-extrabold ${
                        place === 1 ? "text-primary-foreground" : "text-foreground"
                      }`}
                    >
                      <Trophy className="h-6 w-6" /> {place}º
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabela completa */}
      <div className="px-12 pb-10">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
          Resultado Completo
        </h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full">
            <thead style={{ background: "hsl(var(--secondary))" }}>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="p-3 w-12">#</th>
                <th className="p-3">Jogador</th>
                <th className="p-3 text-center">Entradas</th>
                <th className="p-3 text-center">Rebuys</th>
                <th className="p-3 text-center">KOs</th>
                <th className="p-3 text-right">Final</th>
                <th className="p-3 text-right">Lucro</th>
                <th className="p-3 text-right">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, idx) => (
                <tr key={p.id} className="border-t border-border text-sm">
                  <td className="p-3 font-bold text-muted-foreground">{idx + 1}º</td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {p.avatar_url && (
                          <AvatarImage src={p.avatar_url} alt={p.player_nickname} />
                        )}
                        <AvatarFallback className="bg-secondary text-[10px]">
                          {initials(p.player_nickname)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold">{p.player_nickname}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">{p.entries}</td>
                  <td className="p-3 text-center">{p.rebuys}</td>
                  <td className="p-3 text-center">{p.ko_points}</td>
                  <td className="p-3 text-right">{formatBRL(p.final_amount)}</td>
                  <td
                    className={`p-3 text-right font-bold ${
                      p.profit_loss > 0
                        ? "text-success"
                        : p.profit_loss < 0
                          ? "text-destructive"
                          : ""
                    }`}
                  >
                    {formatBRL(p.profit_loss)}
                  </td>
                  <td className="p-3 text-right font-bold text-primary">
                    {p.ranking_points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-12 py-5 text-center"
        style={{
          background: "hsl(var(--background-mid))",
          borderTop: "1px solid hsl(var(--primary) / 0.3)",
        }}
      >
        <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Nexus Poker House · Relatório oficial da partida
        </div>
      </div>
    </div>
  );
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg border border-border p-3"
      style={{ background: "hsl(var(--background-elev))" }}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-bold text-primary">{value}</div>
    </div>
  );
}

GameReport.displayName = "GameReport";
export default GameReport;
