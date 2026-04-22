import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { tempPlayerSchema } from "@/lib/validation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getDefaultAvatar } from "@/lib/defaultAvatar";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (player: { id: string; nickname: string; full_name: string | null }) => void;
}

export default function TempPlayerDialog({ open, onOpenChange, onCreated }: Props) {
  const [nickname, setNickname] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setNickname("");
    setFullName("");
    setGender("");
  }

  async function handleSave() {
    const parsed = tempPlayerSchema.safeParse({
      nickname,
      fullName: fullName || undefined,
      gender: gender || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("temporary_players")
      .insert({
        nickname: parsed.data.nickname,
        full_name: parsed.data.fullName || null,
        gender: parsed.data.gender ?? null,
        avatar_url: getDefaultAvatar(parsed.data.gender ?? null),
      })
      .select("id, nickname, full_name")
      .single();
    if (error || !data) {
      setSaving(false);
      toast.error("Erro ao criar jogador temporário");
      return;
    }
    setSaving(false);
    toast.success("Jogador temporário criado");
    onCreated?.(data);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="nexus-text-gold">Novo Jogador Temporário</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="tp-nick">Nickname *</Label>
            <Input id="tp-nick" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="ex: Coringa" />
          </div>
          <div>
            <Label htmlFor="tp-name">Nome real (opcional)</Label>
            <Input id="tp-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label>Gênero (opcional)</Label>
            <Select value={gender} onValueChange={(v) => setGender(v as typeof gender)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Masculino</SelectItem>
                <SelectItem value="female">Feminino</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-gold text-primary-foreground">
            {saving ? "Salvando..." : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
