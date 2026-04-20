import { Outlet, Link, useNavigate } from "react-router-dom";
import { BarChart3, Home, LogIn, LogOut, Swords, Trophy, User, Users } from "lucide-react";
import NavLink from "./NexusNavLink";
import { Button } from "@/components/ui/button";
import { useMockAuth, MockRole } from "@/context/MockAuthContext";

export default function Layout() {
  const { role, isLoggedIn, user, setRole } = useMockAuth();
  const navigate = useNavigate();
  const isAdmin = role === "admin";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 glass-effect">
        <div className="container flex h-16 items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 rounded-full border-2 border-primary/70 bg-background-mid p-[2px]">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-gold">
                <span className="text-lg font-extrabold text-primary-foreground">N</span>
              </div>
            </div>
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-base font-bold nexus-text-gold">Nexus Poker House</span>
              <span className="text-[11px] text-muted-foreground">A casa oficial dos nossos jogos</span>
            </div>
          </Link>

          <nav className="flex flex-1 justify-center overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1">
              <NavLink to="/" icon={<Home className="h-4 w-4" />}>Dashboard</NavLink>
              <NavLink to="/partidas" icon={<Swords className="h-4 w-4" />}>Partidas</NavLink>
              <NavLink to="/ranking" icon={<Trophy className="h-4 w-4" />}>Ranking</NavLink>
              {isLoggedIn && (
                <NavLink to="/perfil" icon={<User className="h-4 w-4" />}>Perfil</NavLink>
              )}
              {isAdmin && (
                <NavLink to="/estatisticas" icon={<BarChart3 className="h-4 w-4" />}>Estatísticas</NavLink>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-2">
            {/* Dev-only role switcher for Phase 1 preview */}
            <select
              aria-label="Papel (dev)"
              value={role}
              onChange={(e) => setRole(e.target.value as MockRole)}
              className="hidden rounded-md border border-border bg-secondary px-2 py-1 text-xs text-muted-foreground md:block"
            >
              <option value="guest">Visitante</option>
              <option value="user">Usuário</option>
              <option value="admin">Admin</option>
            </select>
            {isLoggedIn ? (
              <Button
                size="sm"
                variant="outline"
                className="border-primary/30 text-foreground hover:bg-primary/10"
                onClick={() => setRole("guest")}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            ) : (
              <Button size="sm" className="bg-gradient-gold text-primary-foreground hover:opacity-90" onClick={() => navigate("/auth")}>
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Entrar</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container py-6 animate-fade-in">
        <Outlet />
      </main>

      <footer className="border-t border-primary/10 py-6">
        <div className="container flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Nexus Poker House</span>
          {isLoggedIn && user && <span>Conectado como <strong className="text-foreground">{user.nickname}</strong></span>}
        </div>
      </footer>
    </div>
  );
}
