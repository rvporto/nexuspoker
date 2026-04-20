import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function CompleteProfile() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <div className="mx-auto max-w-md">
      <div className="nexus-card p-6">
        <h1 className="mb-1 text-2xl font-bold nexus-text-gold">Complete seu perfil</h1>
        <p className="mb-5 text-sm text-muted-foreground">
          Só mais alguns detalhes para começar a jogar.
        </p>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nickname) return toast.error("Nickname é obrigatório.");
            toast.success("Perfil salvo (preview). Backend real na Fase 2.");
            navigate("/");
          }}
        >
          <div>
            <Label htmlFor="nickname">Nickname *</Label>
            <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Seu apelido na mesa" />
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
          <Button type="submit" className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90">
            Salvar e continuar
          </Button>
        </form>
      </div>
    </div>
  );
}
