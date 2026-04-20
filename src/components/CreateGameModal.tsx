import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PlayerSelector, { SelectablePlayer } from "./PlayerSelector";
import { createGameSchema } from "@/lib/validation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: () => void;
}

function nowLocalISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function CreateGameModal({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState<"tournament" | "cash">("tournament");
  const [date, setDate] = useState(nowLocalISO());
  const [buyIn, setBuyIn] = useState("");
  const [rebuyValue, setRebuyValue] = useState("");
  const [seasonYear, setSeasonYear] = useState<string>(String(new Date().getFullYear()));
  const [description, setDescription] = useState("");
  const [players, setPlayers] = useState<SelectablePlayer[]>([]);
  const [saving, setSaving] = useState(false);

  function reset() {
    setName(""); setType("tournament"); setDate(nowLocalISO());
    setBuyIn(""); setRebuyValue(""); setSeasonYear(String(new Date().getFullYear()));
    setDescription(""); setPlayers([]);
  }

  function syncSeasonFromDate(d: string) {
    setDate(d);
    if (d) {
      const y = new Date(d).getFullYear();
      if (!Number.isNaN(y)) setSeasonYear(String(y));
    }
  }

  async function handleSubmit() {
    const parsed = createGameSchema.safeParse({
      name, type, date, buyIn, rebuyValue: rebuyValue || buyIn, seasonYear, description,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    if (players.length === 0) {
      toast.error("Adicione pelo menos um jogador");
      return;
    }
    setSaving(true);
    const { data: game, error: gameErr } = await supabase
      .from("games")
      .insert({
        name: parsed.data.name,
        type: parsed.data.type,
        date: new Date(parsed.data.date).toISOString(),
        season_year: parsed.data.seasonYear,
        buy_in: parsed.data.buyIn,
        rebuy_value: parsed.data.rebuyValue,
        description: parsed.data.description || null,
        status: "scheduled",
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (gameErr || !game) {
      setSaving(false);
      toast.error("Erro ao criar partida: " + (gameErr?.message ?? ""));
      return;
    }

    const participations = players.map((p) => ({
      game_id: game.id,
      user_id: p.type === "user" ? p.id : null,
      temp_player_id: p.type === "temp" ? p.id : null,
      player_name: p.fullName || p.nickname,
      player_nickname: p.nickname,
      entries: 1,
      rebuys: 0,
      total_invested: parsed.data.buyIn,
      final_amount: 0,
      profit_loss: 0,
      profit_percentage: 0,
      ko_points: 0,
      ranking_points: 0,
      is_winner: false,
    }));

    const { error: partErr } = await supabase.from("game_participations").insert(participations);
    setSaving(false);
    if (partErr) {
      toast.error("Partida criada, mas houve erro ao adicionar jogadores: " + partErr.message);
      return;
    }
    toast.success("Partida criada!");
    reset();
    onCreated?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="nexus-text-gold">Nova Partida</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="g-name">Nome *</Label>
            <Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Etapa 1 — Janeiro" />
          </div>

          <div>
            <Label>Tipo *</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tournament">Torneio</SelectItem>
                <SelectItem value="cash">Cash Game</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="g-date">Data e Hora *</Label>
            <Input id="g-date" type="datetime-local" value={date} onChange={(e) => syncSeasonFromDate(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="g-buy">Buy-in (R$) *</Label>
            <Input id="g-buy" type="number" step="0.01" value={buyIn} onChange={(e) => setBuyIn(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="g-reb">Rebuy (R$)</Label>
            <Input id="g-reb" type="number" step="0.01" value={rebuyValue} onChange={(e) => setRebuyValue(e.target.value)} placeholder={buyIn || "igual ao buy-in"} />
          </div>

          <div>
            <Label htmlFor="g-season">Temporada *</Label>
            <Input id="g-season" type="number" value={seasonYear} onChange={(e) => setSeasonYear(e.target.value)} />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {Number(seasonYear) >= 2026 ? "Pontuação por sistema de pontos" : "Pontuação por lucro (R$)"}
            </p>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="g-desc">Descrição</Label>
            <Textarea id="g-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="sm:col-span-2">
            <Label>Jogadores * ({players.length})</Label>
            <PlayerSelector selected={players} onChange={setPlayers} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-gradient-gold text-primary-foreground">
            {saving ? "Criando..." : "Criar Partida"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
