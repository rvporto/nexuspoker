import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatBRL, formatDateTime, initials } from "@/lib/format";
import GameTypeBadge from "./GameTypeBadge";
import { calcParticipationPoints } from "@/lib/scoring";
import { Trash2, Trophy } from "lucide-react";

type GameRow = {
  id: string;
  name: string;
  type: "tournament" | "cash";
  date: string;
  season_year: number;
  buy_in: number;
  rebuy_value: number;
  status: "scheduled" | "finished";
  total_pot: number;
  house_fee: number;
  description: string | null;
};

type Participation = {
  id: string;
  game_id: string;
  user_id: string | null;
  temp_player_id: string | null;
  player_name: string;
  player_nickname: string;
  entries: number;
  rebuys: number;
  total_invested: number;
  final_amount: number;
  profit_loss: number;
  position: number | null;
  is_winner: boolean;
  ko_points: number;
  ranking_points: number;
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  gameId: string | null;
  onChanged?: () => void;
}

export default function GameDetailsModal({ open, onOpenChange, gameId, onChanged }: Props) {
  const { isAdmin } = useAuth();
  const [game, setGame] = useState<GameRow | null>(null);
  const [parts, setParts] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!gameId) return;
    setLoading(true);
    const [g, p] = await Promise.all([
      supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
      supabase.from("game_participations").select("*").eq("game_id", gameId).order("position", { ascending: true, nullsFirst: false }),
    ]);
    setGame((g.data as GameRow) ?? null);
    setParts((p.data as Participation[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { if (open && gameId) load(); }, [open, gameId]);

  function updatePart(id: string, patch: Partial<Participation>) {
    setParts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function saveDraft() {
    if (!game) return;
    setSaving(true);
    const updates = parts.map((p) => {
      const invested = (p.entries * game.buy_in) + (p.rebuys * game.rebuy_value);
      return supabase
        .from("game_participations")
        .update({
          entries: p.entries,
          rebuys: p.rebuys,
          final_amount: p.final_amount,
          ko_points: p.ko_points,
          total_invested: invested,
        })
        .eq("id", p.id);
    });
    const results = await Promise.all(updates);
    setSaving(false);
    if (results.some((r) => r.error)) { toast.error("Erro ao salvar"); return; }
    toast.success("Salvo");
    load();
    onChanged?.();
  }

  async function finalize() {
    if (!game) return;
    setSaving(true);
    // 1. Recalcula invested + profit
    const enriched = parts.map((p) => {
      const invested = (p.entries * game.buy_in) + (p.rebuys * game.rebuy_value);
      const profit = (p.final_amount ?? 0) - invested;
      const profitPct = invested > 0 ? (profit / invested) * 100 : 0;
      return { ...p, total_invested: invested, profit_loss: profit, profit_percentage: profitPct };
    });
    // 2. Ordena por final_amount desc para definir position
    const sorted = [...enriched].sort((a, b) => b.final_amount - a.final_amount);
    const totalPlayers = sorted.length;
    const ranked = sorted.map((p, idx) => {
      const position = idx + 1;
      const points = calcParticipationPoints({
        seasonYear: game.season_year,
        gameType: game.type,
        totalPlayers,
        position,
        profitLoss: p.profit_loss,
        koPoints: p.ko_points ?? 0,
      });
      return { ...p, position, is_winner: position === 1, ranking_points: points };
    });

    const totalPot = ranked.reduce((sum, p) => sum + p.total_invested, 0);

    const updates = ranked.map((p) =>
      supabase
        .from("game_participations")
        .update({
          entries: p.entries,
          rebuys: p.rebuys,
          total_invested: p.total_invested,
          final_amount: p.final_amount,
          profit_loss: p.profit_loss,
          profit_percentage: p.profit_percentage,
          position: p.position,
          is_winner: p.is_winner,
          ko_points: p.ko_points,
          ranking_points: p.ranking_points,
        })
        .eq("id", p.id),
    );
    const partRes = await Promise.all(updates);
    if (partRes.some((r) => r.error)) {
      setSaving(false);
      toast.error("Erro ao finalizar participações");
      return;
    }

    const { error: gErr } = await supabase
      .from("games")
      .update({ status: "finished", total_pot: totalPot })
      .eq("id", game.id);
    setSaving(false);
    if (gErr) { toast.error("Erro ao finalizar partida"); return; }

    toast.success("Partida finalizada! Atualize o ranking para refletir.");
    load();
    onChanged?.();
  }

  async function removeParticipant(id: string) {
    if (!confirm("Remover este jogador da partida?")) return;
    const { error } = await supabase.from("game_participations").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    toast.success("Jogador removido");
    load();
    onChanged?.();
  }

  async function deleteGame() {
    if (!game) return;
    if (!confirm(`Apagar a partida "${game.name}"? Esta ação não pode ser desfeita.`)) return;
    await supabase.from("game_participations").delete().eq("game_id", game.id);
    const { error } = await supabase.from("games").delete().eq("id", game.id);
    if (error) { toast.error("Erro ao apagar"); return; }
    toast.success("Partida apagada");
    onChanged?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 nexus-text-gold">
            {game?.name ?? "Carregando..."}
            {game && <GameTypeBadge type={game.type} />}
            {game?.status === "finished" && (
              <span className="nexus-chip bg-success/15 text-success">Finalizada</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading || !game ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Buy-in" value={formatBRL(game.buy_in)} />
              <Stat label="Rebuy" value={formatBRL(game.rebuy_value)} />
              <Stat label="Jogadores" value={String(parts.length)} />
              <Stat label="Pote total" value={formatBRL(game.total_pot)} />
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDateTime(game.date)} · Temporada {game.season_year}
            </div>
            {game.description && <div className="text-sm">{game.description}</div>}

            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Jogador</TableHead>
                    <TableHead className="w-20">Entradas</TableHead>
                    <TableHead className="w-20">Rebuys</TableHead>
                    <TableHead className="w-24">KOs</TableHead>
                    <TableHead className="w-32">Final (R$)</TableHead>
                    <TableHead className="w-28 text-right">Lucro</TableHead>
                    <TableHead className="w-20 text-right">Pts</TableHead>
                    {isAdmin && game.status !== "finished" && <TableHead className="w-10"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.position && p.position <= 3 ? (
                          <Trophy className={`h-4 w-4 ${p.position === 1 ? "text-primary" : "text-muted-foreground"}`} />
                        ) : (
                          <span className="text-xs text-muted-foreground">{p.position ?? "—"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-gold text-[10px] font-bold text-primary-foreground">
                            {initials(p.player_nickname)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{p.player_nickname}</div>
                            {p.temp_player_id && (
                              <span className="nexus-chip bg-muted/40 text-[9px] uppercase text-muted-foreground">temp</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" min={1}
                          value={p.entries}
                          disabled={!isAdmin || game.status === "finished"}
                          onChange={(e) => updatePart(p.id, { entries: Number(e.target.value) })}
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" min={0}
                          value={p.rebuys}
                          disabled={!isAdmin || game.status === "finished"}
                          onChange={(e) => updatePart(p.id, { rebuys: Number(e.target.value) })}
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" min={0}
                          value={p.ko_points}
                          disabled={!isAdmin || game.status === "finished"}
                          onChange={(e) => updatePart(p.id, { ko_points: Number(e.target.value) })}
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" step="0.01" min={0}
                          value={p.final_amount}
                          disabled={!isAdmin || game.status === "finished"}
                          onChange={(e) => updatePart(p.id, { final_amount: Number(e.target.value) })}
                          className="h-8 w-28"
                        />
                      </TableCell>
                      <TableCell className={`text-right text-sm font-semibold ${p.profit_loss > 0 ? "text-success" : p.profit_loss < 0 ? "text-destructive" : ""}`}>
                        {formatBRL(p.profit_loss)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-primary">
                        {p.ranking_points}
                      </TableCell>
                      {isAdmin && game.status !== "finished" && (
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => removeParticipant(p.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {isAdmin && game?.status === "scheduled" && (
            <>
              <Button variant="outline" onClick={saveDraft} disabled={saving}>
                Salvar rascunho
              </Button>
              <Button onClick={finalize} disabled={saving} className="bg-gradient-gold text-primary-foreground">
                Finalizar Partida
              </Button>
            </>
          )}
          {isAdmin && (
            <Button variant="outline" onClick={deleteGame} className="border-destructive/40 text-destructive">
              Apagar partida
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-bold text-primary">{value}</div>
    </div>
  );
}
