import { forwardRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatBRL, initials } from "@/lib/format";
import { Crown, Trophy } from "lucide-react";

export type ReportRow = {
  id: string;
  position: number;
  player_nickname: string;
  avatar_url: string | null;
  total_points: number;
  total_profit: number;
  games_played: number;
  wins: number;
  tournament_wins: number;
};

interface Props {
  season: number;
  rows: ReportRow[];
  metric: "points" | "profit";
}

const RankingReport = forwardRef<HTMLDivElement, Props>(({ season, rows, metric }, ref) => {
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div
      ref={ref}
      className="bg-background"
      style={{
        width: 1200,
        minHeight: 1600,
        fontFamily: "Inter, system-ui, sans-serif",
        color: "hsl(var(--foreground))",
      }}
    >
      {/* Header */}
      <div
        className="relative px-12 py-10"
        style={{
          background: "linear-gradient(135deg, hsl(var(--background-mid)) 0%, hsl(var(--background)) 100%)",
          borderBottom: "2px solid hsl(var(--primary) / 0.3)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Nexus Poker House</div>
            <h1 className="mt-2 text-5xl font-extrabold nexus-text-gold">RANKING OFICIAL</h1>
            <div className="mt-1 text-xl text-muted-foreground">Temporada {season}</div>
          </div>
          <div className="text-right">
            <Crown className="ml-auto h-12 w-12 text-primary" />
            <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">Gerado em</div>
            <div className="text-sm font-semibold">{today}</div>
          </div>
        </div>
      </div>

      {/* Pódio */}
      {top3.length > 0 && (
        <div className="px-12 py-10">
          <div className="grid grid-cols-3 items-end gap-6">
            {[top3[1], top3[0], top3[2]].filter(Boolean).map((row, idx) => {
              const place = idx === 1 ? 1 : idx === 0 ? 2 : 3;
              const heights = [220, 280, 180];
              return (
                <div key={row.id} className="flex flex-col items-center gap-3">
                  <Avatar className="h-24 w-24 border-4 border-primary/60">
                    {row.avatar_url && <AvatarImage src={row.avatar_url} alt={row.player_nickname} />}
                    <AvatarFallback className="bg-secondary text-2xl">
                      {initials(row.player_nickname)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <div className="max-w-[260px] truncate text-2xl font-bold">{row.player_nickname}</div>
                    <div className="mt-1 text-lg font-bold text-primary">
                      {metric === "points" ? `${row.total_points} pts` : formatBRL(row.total_profit)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.games_played} partidas · {row.tournament_wins} {row.tournament_wins === 1 ? "vitória" : "vitórias"} em torneios
                    </div>
                  </div>
                  <div
                    className="flex w-full items-start justify-center rounded-t-xl pt-3"
                    style={{
                      height: heights[idx],
                      background: "linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.6) 100%)",
                    }}
                  >
                    <div className="flex items-center gap-2 text-3xl font-extrabold text-primary-foreground">
                      <Trophy className="h-6 w-6" /> {place}º
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabela */}
      {rest.length > 0 && (
        <div className="px-12 pb-10">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Demais classificados
          </h2>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full">
              <thead style={{ background: "hsl(var(--secondary))" }}>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 w-16">Pos</th>
                  <th className="p-4">Jogador</th>
                  <th className="p-4 text-right">Partidas</th>
                  <th className="p-4 text-right">Vit. Torneios</th>
                  <th className="p-4 text-right">{metric === "points" ? "Pontos" : "Lucro"}</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((row) => (
                  <tr key={row.id} className="border-t border-border text-base">
                    <td className="p-4 font-bold text-muted-foreground">{row.position}º</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {row.avatar_url && <AvatarImage src={row.avatar_url} alt={row.player_nickname} />}
                          <AvatarFallback className="bg-secondary text-xs">
                            {initials(row.player_nickname)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold">{row.player_nickname}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">{row.games_played}</td>
                    <td className="p-4 text-right">{row.tournament_wins}</td>
                    <td className="p-4 text-right font-bold text-primary">
                      {metric === "points" ? `${row.total_points} pts` : formatBRL(row.total_profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="mt-auto px-12 py-6 text-center"
        style={{
          background: "hsl(var(--background-mid))",
          borderTop: "1px solid hsl(var(--primary) / 0.3)",
        }}
      >
        <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Nexus Poker House · {rows.length} jogadores
        </div>
      </div>
    </div>
  );
});

RankingReport.displayName = "RankingReport";
export default RankingReport;
