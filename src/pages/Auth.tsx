import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { signInSchema, signUpSchema } from "@/lib/validation";

export default function Auth() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Informe seu email.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Enviamos um link de recuperação para seu email.");
      setMode("login");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (isLoggedIn) navigate("/", { replace: true });
  }, [isLoggedIn, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse({ email, password, fullName, nickname });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: parsed.data.fullName, nickname: parsed.data.nickname },
          },
        });
        if (error) {
          if (error.message.toLowerCase().includes("already")) {
            toast.error("Este email já está cadastrado. Faça login.");
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success("Conta criada! Complete seu perfil.");
        navigate("/complete-profile");
      } else {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) {
          toast.error("Email ou senha incorretos.");
          return;
        }
        toast.success("Bem-vindo de volta!");
        navigate("/");
      }
    } finally {
      setSubmitting(false);
    }
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
          {mode === "signup" && (
            <>
              <div>
                <Label htmlFor="fullName">Nome completo *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>
              <div>
                <Label htmlFor="nickname">Nickname *</Label>
                <Input
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Seu apelido na mesa"
                  required
                  minLength={2}
                  maxLength={30}
                />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90"
          >
            {submitting ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "login" ? "Ainda não tem conta? " : "Já tem conta? "}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Criar" : "Entrar"}
          </button>
        </p>
      </div>
    </div>
  );
}
