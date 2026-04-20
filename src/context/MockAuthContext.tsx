import { createContext, useContext, useState, ReactNode } from "react";

/**
 * MOCK auth context for Phase 1. Will be replaced by Lovable Cloud auth in Phase 2.
 * Toggle role/login state via the dev toggles in the header to preview permission states.
 */

export type MockRole = "guest" | "user" | "admin";

type AuthCtx = {
  role: MockRole;
  isLoggedIn: boolean;
  user: { nickname: string; fullName: string; avatarUrl?: string } | null;
  setRole: (r: MockRole) => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<MockRole>("guest");
  const isLoggedIn = role !== "guest";
  const user = isLoggedIn
    ? {
        nickname: role === "admin" ? "AdminNexus" : "Jogador01",
        fullName: role === "admin" ? "Administrador" : "Carlos Silva",
      }
    : null;
  return <Ctx.Provider value={{ role, isLoggedIn, user, setRole }}>{children}</Ctx.Provider>;
}

export function useMockAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMockAuth must be used within MockAuthProvider");
  return ctx;
}
