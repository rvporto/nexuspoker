import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface Props {
  to: string;
  children: ReactNode;
  icon?: ReactNode;
}

export default function NexusNavLink({ to, children, icon }: Props) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <RouterNavLink
      to={to}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </RouterNavLink>
  );
}
