import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMockAuth } from "@/context/MockAuthContext";
import { toast } from "sonner";

export default function Auth() {
  const { setRole } = useMockAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha email e senha.");
      return;
    }
    // Phase 1: mock login. Admin if email contains "admin"
    setRole(email.includes("admin") ? "admin" : "user");
    toast.success("Entrou (preview). Backend real na Fase 2.");
    navigate("/");
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="nexus-card p-6">
        <h1 className="mb-1 text-2xl font-bold nexus-text-gold">
          {mode === "login" ? "Entrar" : "Criar conta"}
        </h1>
        <p className="mb-5 text-sm text-muted-foreground">
          {mode === "login"
            ? "Acesse sua conta da Nexus Poker House."
            : "Cadastre-se para acompanhar seu progresso."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "login" ? "Ainda não tem conta? " : "Já tem conta? "}
          <button className="text-primary hover:underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "Criar" : "Entrar"}
          </button>
        </p>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Dica (preview): use um email com "admin" para logar como administrador.
        </p>
      </div>
    </div>
  );
}
