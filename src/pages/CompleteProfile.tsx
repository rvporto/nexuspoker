import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { completeProfileSchema } from "@/lib/validation";

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, loading } = useAuth();
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname ?? "");
      setPhone(profile.phone ?? "");
      setGender((profile.gender as typeof gender) ?? "");
    }
  }, [profile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = completeProfileSchema.safeParse({
      nickname,
      phone,
      gender: gender || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nickname: parsed.data.nickname,
        phone: parsed.data.phone || null,
        gender: parsed.data.gender ?? null,
        profile_completed: true,
      })
      .eq("id", user.id);
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao salvar perfil.");
      return;
    }
    await refreshProfile();
    toast.success("Perfil salvo!");
    navigate("/");
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="nexus-card p-6">
        <h1 className="mb-1 text-2xl font-bold nexus-text-gold">Complete seu perfil</h1>
        <p className="mb-5 text-sm text-muted-foreground">
          Só mais alguns detalhes para começar a jogar.
        </p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="nickname">Nickname *</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Seu apelido na mesa"
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <Label htmlFor="gender">Gênero</Label>
            <Select value={gender} onValueChange={(v) => setGender(v as typeof gender)}>
              <SelectTrigger id="gender">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Masculino</SelectItem>
                <SelectItem value="female">Feminino</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90"
          >
            {submitting ? "Salvando..." : "Salvar e continuar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
