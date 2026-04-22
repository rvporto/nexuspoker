import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { initials } from "@/lib/format";
import { Upload } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: () => void;
}

export default function EditProfileDialog({ open, onOpenChange, onSaved }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [gender, setGender] = useState<string>(profile?.gender ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function uploadFile(file: File) {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Falha no upload: " + error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setUploading(false);
    toast.success("Avatar carregado");
  }

  async function save() {
    if (!user) return;
    if (!nickname.trim()) { toast.error("Nickname é obrigatório"); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      nickname: nickname.trim(),
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      gender: (gender || null) as any,
      avatar_url: avatarUrl,
      profile_completed: true,
    }).eq("id", user.id);
    if (error) { setSaving(false); toast.error(error.message); return; }
    // sincroniza ranking
    await supabase.from("public_rankings").update({
      avatar_url: avatarUrl,
      player_nickname: nickname.trim(),
      player_name: fullName.trim() || null,
    }).eq("player_ref_id", user.id).eq("player_type", "user");
    setSaving(false);
    toast.success("Perfil atualizado");
    await refreshProfile();
    onSaved?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="nexus-text-gold">Editar perfil</DialogTitle></DialogHeader>

        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-primary/60">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
            <AvatarFallback className="bg-gradient-gold text-xl font-bold text-primary-foreground">
              {initials(nickname || fullName || "?")}
            </AvatarFallback>
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
                />
                <Button asChild size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10" disabled={uploading}>
                  <span><Upload className="h-3 w-3" /> {uploading ? "Enviando..." : "Upload"}</span>
                </Button>
              </label>
              <Button size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10" onClick={() => setAiOpen(true)}>
                <Sparkles className="h-3 w-3" /> Avatar IA
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            <div>
              <Label htmlFor="nick">Nickname *</Label>
              <Input id="nick" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Seu apelido" />
            </div>
            <div>
              <Label htmlFor="fullname">Nome completo</Label>
              <Input id="fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label>Gênero</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Feminino</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-gradient-gold text-primary-foreground">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AiAvatarDialog open={aiOpen} onOpenChange={setAiOpen} onPick={handleAiAvatar} />
    </>
  );
}
