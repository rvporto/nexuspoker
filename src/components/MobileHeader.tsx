import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, Home, LogIn, LogOut, Menu, Swords, Trophy, User, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import nexusLogo from "@/assets/nexus-logo.png";
import nexusWordmark from "@/assets/nexus-wordmark.png";

/**
 * Mobile-only header (<768px):
 * - Logo Nexus centralizado com ornamentos dourados
 * - Cabeçalho some ao rolar a página
 * - FAB dourado fixo no canto sup. direito (parte do header quando scroll=0,
 *   vira fixed com transição suave após começar a rolar)
 * - Drawer abre da direita: logo "NEXUS" centralizado, fundo blur, links
 */
export default function MobileHeader() {
  const { isLoggedIn, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    navigate("/");
  }

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  const navItems = [
    { to: "/", label: "Dashboard", icon: Home, show: true },
    { to: "/partidas", label: "Partidas", icon: Swords, show: true },
    { to: "/ranking", label: "Ranking", icon: Trophy, show: true },
    { to: "/perfil", label: "Perfil", icon: User, show: isLoggedIn },
    { to: "/estatisticas", label: "Estatísticas", icon: BarChart3, show: isAdmin },
  ];

  return (
    <>
      {/* Header que some ao rolar */}
      <header
        className={cn(
          "relative z-30 transition-all duration-300 ease-out md:hidden",
          scrolled ? "pointer-events-none -translate-y-full opacity-0" : "translate-y-0 opacity-100",
        )}
      >
        <div className="relative flex items-center justify-center bg-background-mid/95 px-4 py-3">
          {/* Ornamento esquerdo */}
          <Ornament side="left" />
          {/* Logo central */}
          <Link to="/" className="mx-3 flex shrink-0 items-center justify-center">
            <img src={nexusLogo} alt="Nexus Poker House" className="h-16 w-auto object-contain" />
          </Link>
          {/* Ornamento direito */}
          <Ornament side="right" />
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </header>

      {/* FAB de menu — sempre visível, position fixed no scroll */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Abrir menu"
            className={cn(
              "fixed right-3 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground shadow-[0_4px_18px_-2px_hsl(46_65%_52%/0.55)] transition-all duration-300 ease-out md:hidden",
              scrolled ? "top-3" : "top-4",
            )}
          >
            <Menu className="h-6 w-6" strokeWidth={2.5} />
          </button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-[88vw] max-w-sm border-primary/20 bg-background/85 p-0 backdrop-blur-xl"
        >
          {/* Header do drawer com logo wordmark */}
          <div className="relative flex items-center justify-center border-b border-primary/15 px-6 pt-8 pb-6">
            <img
              src={nexusWordmark}
              alt="Nexus Poker House"
              className="h-12 w-auto object-contain"
            />
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Links */}
          <nav className="flex flex-col gap-1.5 p-4">
            {navItems
              .filter((it) => it.show)
              .map((it) => {
                const isActive = location.pathname === it.to;
                const Icon = it.icon;
                return (
                  <button
                    key={it.to}
                    onClick={() => go(it.to)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition-colors",
                      isActive
                        ? "bg-gradient-gold text-primary-foreground"
                        : "text-foreground hover:bg-secondary",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {it.label}
                  </button>
                );
              })}
          </nav>

          {/* Footer do drawer */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-primary/15 p-4">
            {isLoggedIn ? (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-base font-semibold"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5" /> Sair
              </Button>
            ) : (
              <Button
                className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90"
                onClick={() => go("/auth")}
              >
                <LogIn className="h-4 w-4" /> Entrar
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Ornament({ side }: { side: "left" | "right" }) {
  // Filete dourado decorativo simulando os ornamentos da imagem de referência
  const flip = side === "right" ? "scale-x-[-1]" : "";
  return (
    <div className={cn("flex flex-1 items-center gap-1", flip)}>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/60 to-primary" />
      <svg viewBox="0 0 32 12" className="h-3 w-8 text-primary" fill="currentColor" aria-hidden>
        <path d="M0 6 Q 8 0, 16 6 T 32 6 L 30 6 Q 22 2, 16 6 T 2 6 Z" opacity="0.85" />
      </svg>
      <div className="h-1 w-1 rounded-full bg-primary" />
    </div>
  );
}
