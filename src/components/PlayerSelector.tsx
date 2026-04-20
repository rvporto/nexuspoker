import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TempPlayerDialog from "./TempPlayerDialog";
import { initials } from "@/lib/format";

export type SelectablePlayer = {
  type: "user" | "temp";
  id: string; // user_id ou temp_player_id
  nickname: string;
  fullName: string | null;
};

interface Props {
  selected: SelectablePlayer[];
  onChange: (p: SelectablePlayer[]) => void;
}

export default function PlayerSelector({ selected, onChange }: Props) {
  const [users, setUsers] = useState<SelectablePlayer[]>([]);
  const [temps, setTemps] = useState<SelectablePlayer[]>([]);
  const [query, setQuery] = useState("");
  const [tempDialog, setTempDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [profilesRes, tempsRes] = await Promise.all([
      supabase.from("profiles").select("id, nickname, full_name"),
      supabase.from("temporary_players").select("id, nickname, full_name"),
    ]);
    setUsers(
      (profilesRes.data ?? []).map((p) => ({
        type: "user" as const,
        id: p.id,
        nickname: p.nickname || "(sem nick)",
        fullName: p.full_name,
      })),
    );
    setTemps(
      (tempsRes.data ?? []).map((t) => ({
        type: "temp" as const,
        id: t.id,
        nickname: t.nickname,
        fullName: t.full_name,
      })),
    );
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  const isSelected = (p: SelectablePlayer) =>
    selected.some((s) => s.type === p.type && s.id === p.id);

  function toggle(p: SelectablePlayer) {
    if (isSelected(p)) {
      onChange(selected.filter((s) => !(s.type === p.type && s.id === p.id)));
    } else {
      onChange([...selected, p]);
    }
  }

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.nickname.toLowerCase().includes(query.toLowerCase()) ||
          (u.fullName ?? "").toLowerCase().includes(query.toLowerCase()),
      ),
    [users, query],
  );
  const filteredTemps = useMemo(
    () =>
      temps.filter(
        (t) =>
          t.nickname.toLowerCase().includes(query.toLowerCase()) ||
          (t.fullName ?? "").toLowerCase().includes(query.toLowerCase()),
      ),
    [temps, query],
  );

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-secondary/40 p-2">
          {selected.map((p) => (
            <span
              key={`${p.type}-${p.id}`}
              className="nexus-chip flex items-center gap-1.5 bg-primary/15 text-primary"
            >
              {p.nickname}
              {p.type === "temp" && <span className="text-[9px] uppercase opacity-70">temp</span>}
              <button onClick={() => toggle(p)} className="hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar jogadores..."
            className="pl-9"
          />
        </div>
        <Button type="button" variant="outline" onClick={() => setTempDialog(true)}>
          <Plus className="h-4 w-4" /> Temporário
        </Button>
      </div>

      <ScrollArea className="h-64 rounded-lg border border-border bg-background-mid">
        <div className="p-2">
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cadastrados ({filteredUsers.length})
          </div>
          {loading && <div className="p-3 text-xs text-muted-foreground">Carregando...</div>}
          {filteredUsers.map((p) => (
            <PlayerRow key={p.id} p={p} selected={isSelected(p)} onToggle={() => toggle(p)} />
          ))}
          {!loading && filteredUsers.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum usuário encontrado.</div>
          )}

          <div className="mt-3 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Temporários ({filteredTemps.length})
          </div>
          {filteredTemps.map((p) => (
            <PlayerRow key={p.id} p={p} selected={isSelected(p)} onToggle={() => toggle(p)} />
          ))}
          {!loading && filteredTemps.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum temporário ainda.</div>
          )}
        </div>
      </ScrollArea>

      <TempPlayerDialog
        open={tempDialog}
        onOpenChange={setTempDialog}
        onCreated={(t) => {
          const newP: SelectablePlayer = { type: "temp", id: t.id, nickname: t.nickname, fullName: t.full_name };
          setTemps((prev) => [...prev, newP]);
          onChange([...selected, newP]);
        }}
      />
    </div>
  );
}

function PlayerRow({ p, selected, onToggle }: { p: SelectablePlayer; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors ${
        selected ? "bg-primary/10" : "hover:bg-secondary"
      }`}
    >
      <Checkbox checked={selected} className="pointer-events-none" />
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-gold text-[11px] font-bold text-primary-foreground">
        {initials(p.nickname)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{p.nickname}</div>
        {p.fullName && <div className="truncate text-[11px] text-muted-foreground">{p.fullName}</div>}
      </div>
      {p.type === "temp" && (
        <span className="nexus-chip bg-muted/40 text-[9px] uppercase text-muted-foreground">temp</span>
      )}
    </button>
  );
}
