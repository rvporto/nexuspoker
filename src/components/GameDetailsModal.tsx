import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatBRL, formatDateTime, initials } from "@/lib/format";
import GameTypeBadge from "./GameTypeBadge";
import GameReport from "./GameReport";
import { calcParticipationPoints } from "@/lib/scoring";
import { FileDown, Pencil, Trash2, Trophy } from "lucide-react";
import { toJpeg } from "html-to-image";

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
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  async function load() {
    if (!gameId) return;
    setLoading(true);
    const [g, p] = await Promise.all([
      supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
      supabase.from("game_participations").select("*").eq("game_id", gameId).order("position", { ascending: true, nullsFirst: false }),
    ]);
    setGame((g.data as GameRow) ?? null);
    const participations = (p.data as Participation[]) ?? [];
    setParts(participations);

    // Busca avatares dos participantes (profiles + temporary_players)
    const userIds = participations.map((x) => x.user_id).filter(Boolean) as string[];
    const tempIds = participations.map((x) => x.temp_player_id).filter(Boolean) as string[];
    const map: Record<string, string | null> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, avatar_url").in("id", userIds);
      profs?.forEach((pr: any) => { map[`u:${pr.id}`] = pr.avatar_url; });
    }
    if (tempIds.length) {
      const { data: temps } = await supabase.from("temporary_players").select("id, avatar_url").in("id", tempIds);
      temps?.forEach((tp: any) => { map[`t:${tp.id}`] = tp.avatar_url; });
    }
    setAvatars(map);
    setLoading(false);
  }

  function avatarFor(p: Participation): string | null {
    if (p.user_id) return avatars[`u:${p.user_id}`] ?? null;
    if (p.temp_player_id) return avatars[`t:${p.temp_player_id}`] ?? null;
    return null;
  }

  useEffect(() => { if (open && gameId) { setEditMode(false); load(); } }, [open, gameId]);

  const isEditable = isAdmin && (game?.status !== "finished" || editMode);

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
          position: p.position,
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
    const totalPlayers = enriched.length;
    // Total de "ações" do torneio = soma de entries + rebuys (regulamento 2026)
    const totalActions = enriched.reduce((s, p) => s + (p.entries ?? 0) + (p.rebuys ?? 0), 0);

    // Posições:
    // Torneio → posição manual (1..N) OU fallback por final_amount
    // Cash    → posição = colocação no LUCRO (1 = maior lucro)
    let ranked;
    if (game.type === "tournament") {
      const hasManualPositions = enriched.every((p) => p.position && p.position > 0);
      const sorted = hasManualPositions
        ? [...enriched].sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
        : [...enriched].sort((a, b) => b.final_amount - a.final_amount);
      ranked = sorted.map((p, idx) => {
        const position = hasManualPositions ? (p.position ?? idx + 1) : idx + 1;
        const points = calcParticipationPoints({
          seasonYear: game.season_year,
          gameType: "tournament",
          totalPlayers,
          totalActions,
          position,
          profitLoss: p.profit_loss,
          buyInValue: game.buy_in,
          koPoints: p.ko_points ?? 0,
        });
        return { ...p, position, is_winner: position === 1, ranking_points: points };
      });
    } else {
      // CASH: ordena por LUCRO desc → colocação no lucro
      const sorted = [...enriched].sort((a, b) => b.profit_loss - a.profit_loss);
      ranked = sorted.map((p, idx) => {
        const profitPosition = idx + 1;
        const points = calcParticipationPoints({
          seasonYear: game.season_year,
          gameType: "cash",
          totalPlayers,
          totalActions,
          position: profitPosition,
          profitLoss: p.profit_loss,
          buyInValue: game.buy_in,
          koPoints: p.ko_points ?? 0,
        });
        return {
          ...p,
          position: profitPosition,
          is_winner: profitPosition === 1 && p.profit_loss > 0,
          ranking_points: points,
        };
      });
    }

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
    if (gErr) { setSaving(false); toast.error("Erro ao finalizar partida"); return; }

    // Atualiza ranking automaticamente
    const { error: rErr } = await supabase.functions.invoke("update-ranking", {
      body: { seasonYear: game.season_year },
    });
    setSaving(false);
    setEditMode(false);
    if (rErr) toast.warning("Partida finalizada, mas falhou ao recalcular ranking: " + rErr.message);
    else toast.success("Partida finalizada e ranking atualizado!");
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

  async function downloadJpeg() {
    if (!reportRef.current) return;
    setDownloadingReport(true);
    try {
      const dataUrl = await toJpeg(reportRef.current, { quality: 0.95, pixelRatio: 2, backgroundColor: "#0a0a0a" });
      const link = document.createElement("a");
      link.download = `partida-${game?.name?.replace(/\s+/g, "-").toLowerCase() ?? "nexus"}.jpg`;
      link.href = dataUrl;
      link.click();
      toast.success("Relatório da partida baixado");
    } catch (e: any) {
      toast.error("Falha ao gerar JPEG: " + (e?.message ?? ""));
    } finally {
      setDownloadingReport(false);
    }
  }

  const reportRows = parts.map((p) => ({
    id: p.id,
    player_nickname: p.player_nickname,
    avatar_url: avatarFor(p),
    position: p.position,
    entries: p.entries,
    rebuys: p.rebuys,
    ko_points: p.ko_points,
    final_amount: p.final_amount,
    profit_loss: p.profit_loss,
    ranking_points: p.ranking_points,
  }));

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

            {/* Desktop: tabela completa */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">{game.type === "tournament" ? "Pos." : "#"}</TableHead>
                    <TableHead>Jogador</TableHead>
                    <TableHead className="w-20">Entradas</TableHead>
                    <TableHead className="w-20">Rebuys</TableHead>
                    <TableHead className="w-24">KOs</TableHead>
                    <TableHead className="w-32">Final (R$)</TableHead>
                    <TableHead className="w-28 text-right">Lucro</TableHead>
                    <TableHead className="w-20 text-right">Pts</TableHead>
                    {isEditable && <TableHead className="w-10"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {game.type === "tournament" && isEditable ? (
                          <Input
                            type="number" min={1}
                            value={p.position ?? ""}
                            placeholder="—"
                            onChange={(e) => updatePart(p.id, { position: e.target.value ? Number(e.target.value) : null })}
                            className="h-8 w-14"
                          />
                        ) : p.position && p.position <= 3 ? (
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
                          disabled={!isEditable}
                          onChange={(e) => updatePart(p.id, { entries: Number(e.target.value) })}
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" min={0}
                          value={p.rebuys}
                          disabled={!isEditable}
                          onChange={(e) => updatePart(p.id, { rebuys: Number(e.target.value) })}
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" min={0}
                          value={p.ko_points}
                          disabled={!isEditable}
                          onChange={(e) => updatePart(p.id, { ko_points: Number(e.target.value) })}
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" step="0.01" min={0}
                          value={p.final_amount}
                          disabled={!isEditable}
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
                      {isEditable && (
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

            {/* Mobile: cards compactos */}
            <div className="space-y-2 md:hidden">
              {parts.map((p) => (
                <div key={p.id} className="rounded-lg border border-border bg-secondary/30 p-3">
                  {/* Header: pos + nome + lucro/pts */}
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-gold text-xs font-bold text-primary-foreground">
                      {p.position && p.position <= 3 ? (
                        <Trophy className="h-4 w-4" />
                      ) : (
                        initials(p.player_nickname)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{p.player_nickname}</span>
                        {p.temp_player_id && (
                          <span className="nexus-chip bg-muted/40 text-[9px] uppercase text-muted-foreground">temp</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>Pos. {p.position ?? "—"}</span>
                        <span>·</span>
                        <span className="font-semibold text-primary">{p.ranking_points} pts</span>
                        <span>·</span>
                        <span className={`font-semibold ${p.profit_loss > 0 ? "text-success" : p.profit_loss < 0 ? "text-destructive" : ""}`}>
                          {formatBRL(p.profit_loss)}
                        </span>
                      </div>
                    </div>
                    {isEditable && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeParticipant(p.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>

                  {/* Inputs em grid 2x2 / 2x3 */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {game.type === "tournament" && (
                      <MobileField label="Pos.">
                        <Input
                          type="number" min={1}
                          value={p.position ?? ""}
                          placeholder="—"
                          disabled={!isEditable}
                          onChange={(e) => updatePart(p.id, { position: e.target.value ? Number(e.target.value) : null })}
                          className="h-8 text-sm"
                        />
                      </MobileField>
                    )}
                    <MobileField label="Entradas">
                      <Input
                        type="number" min={1}
                        value={p.entries}
                        disabled={!isEditable}
                        onChange={(e) => updatePart(p.id, { entries: Number(e.target.value) })}
                        className="h-8 text-sm"
                      />
                    </MobileField>
                    <MobileField label="Rebuys">
                      <Input
                        type="number" min={0}
                        value={p.rebuys}
                        disabled={!isEditable}
                        onChange={(e) => updatePart(p.id, { rebuys: Number(e.target.value) })}
                        className="h-8 text-sm"
                      />
                    </MobileField>
                    <MobileField label="KOs">
                      <Input
                        type="number" min={0}
                        value={p.ko_points}
                        disabled={!isEditable}
                        onChange={(e) => updatePart(p.id, { ko_points: Number(e.target.value) })}
                        className="h-8 text-sm"
                      />
                    </MobileField>
                    <MobileField label="Final (R$)" className={game.type === "cash" ? "col-span-2" : ""}>
                      <Input
                        type="number" step="0.01" min={0}
                        value={p.final_amount}
                        disabled={!isEditable}
                        onChange={(e) => updatePart(p.id, { final_amount: Number(e.target.value) })}
                        className="h-8 text-sm"
                      />
                    </MobileField>
                  </div>
                </div>
              ))}
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
          {isAdmin && game?.status === "finished" && !editMode && (
            <Button variant="outline" onClick={() => setEditMode(true)} className="border-primary/40 text-primary">
              <Pencil className="h-4 w-4" /> Editar partida
            </Button>
          )}
          {isAdmin && game?.status === "finished" && editMode && (
            <>
              <Button variant="outline" onClick={() => { setEditMode(false); load(); }} disabled={saving}>
                Cancelar edição
              </Button>
              <Button onClick={finalize} disabled={saving} className="bg-gradient-gold text-primary-foreground">
                {saving ? "Salvando..." : "Salvar e recalcular"}
              </Button>
            </>
          )}
          {game?.status === "finished" && (
            <Button variant="outline" onClick={downloadJpeg} disabled={downloadingReport} className="border-primary/40 text-primary">
              <FileDown className="h-4 w-4" /> {downloadingReport ? "Gerando..." : "Baixar JPEG"}
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" onClick={deleteGame} className="border-destructive/40 text-destructive">
              Apagar partida
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>

        {/* Report off-screen usado para gerar JPEG */}
        {game && game.status === "finished" && (
          <div style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
            <GameReport ref={reportRef} game={game} rows={reportRows} />
          </div>
        )}
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
