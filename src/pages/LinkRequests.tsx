import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, LinkIcon, X } from "lucide-react";
import { formatDateTime, initials } from "@/lib/format";

type Req = {
  id: string;
  user_id: string;
  temp_player_id: string;
  requested_at: string;
  status: "pending" | "approved" | "rejected";
};

type Profile = { id: string; nickname: string | null; full_name: string | null; avatar_url: string | null };
type Temp = { id: string; nickname: string; full_name: string | null };

export default function LinkRequests() {
  const { isAdmin, loading } = useAuth();
  const [requests, setRequests] = useState<Req[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [temps, setTemps] = useState<Map<string, Temp>>(new Map());
  const [busy, setBusy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const { data: rq } = await supabase
      .from("link_requests")
      .select("id, user_id, temp_player_id, requested_at, status")
      .eq("status", "pending")
      .order("requested_at", { ascending: false });
    const list = (rq ?? []) as Req[];
    setRequests(list);

    const userIds = Array.from(new Set(list.map((r) => r.user_id)));
    const tempIds = Array.from(new Set(list.map((r) => r.temp_player_id)));

    if (userIds.length) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("id, nickname, full_name, avatar_url")
        .in("id", userIds);
      const m = new Map<string, Profile>();
      (ps ?? []).forEach((p) => m.set(p.id, p as Profile));
      setProfiles(m);
    } else setProfiles(new Map());

    if (tempIds.length) {
      const { data: ts } = await supabase
        .from("temporary_players")
        .select("id, nickname, full_name")
        .in("id", tempIds);
      const m = new Map<string, Temp>();
      (ts ?? []).forEach((t) => m.set(t.id, t as Temp));
      setTemps(m);
    } else setTemps(new Map());

    setLoaded(true);
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function approve(req: Req) {
    setBusy(req.id);
    const { data, error } = await supabase.functions.invoke("approve-link-request", {
      body: {
        tempPlayerId: req.temp_player_id,
        userId: req.user_id,
        linkRequestId: req.id,
      },
    });
    setBusy(null);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    toast.success(`Vinculado! ${data?.migratedCount ?? 0} partidas migradas`);
    load();
    // Trigger ranking recalc para a temporada atual
    supabase.functions.invoke("update-ranking", { body: { seasonYear: new Date().getFullYear() } });
  }

  async function reject(req: Req) {
    if (!confirm("Rejeitar esta solicitação?")) return;
    setBusy(req.id);
    const { error } = await supabase
      .from("link_requests")
      .update({ status: "rejected", resolved_at: new Date().toISOString() })
      .eq("id", req.id);
    setBusy(null);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    toast.success("Solicitação rejeitada");
    load();
  }

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold nexus-text-gold">Vínculos pendentes</h1>
        <p className="text-sm text-muted-foreground">
          Aprove ou rejeite solicitações de jogadores que querem assumir um perfil temporário.
        </p>
      </header>

      {!loaded && (
        <div className="nexus-card p-10 text-center text-sm text-muted-foreground">Carregando...</div>
      )}

      {loaded && requests.length === 0 && (
        <div className="nexus-card p-10 text-center text-sm text-muted-foreground">
          Nenhuma solicitação pendente.
        </div>
      )}

      <div className="space-y-3">
        {requests.map((r) => {
          const p = profiles.get(r.user_id);
          const t = temps.get(r.temp_player_id);
          return (
            <div key={r.id} className="nexus-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold text-xs font-bold text-primary-foreground">
                  {initials(p?.nickname || p?.full_name || "?")}
                </div>
                <div className="text-sm">
                  <div className="font-semibold">{p?.nickname || "(sem nick)"}</div>
                  {p?.full_name && (
                    <div className="text-xs text-muted-foreground">{p.full_name}</div>
                  )}
                </div>
                <LinkIcon className="mx-2 h-4 w-4 text-primary" />
                <div className="text-sm">
                  <div className="font-semibold">{t?.nickname ?? "—"}</div>
                  <span className="nexus-chip bg-muted/40 text-[10px] uppercase text-muted-foreground">temp</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {formatDateTime(r.requested_at)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  disabled={busy === r.id}
                  onClick={() => reject(r)}
                >
                  <X className="h-3 w-3" /> Rejeitar
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-gold text-primary-foreground"
                  disabled={busy === r.id}
                  onClick={() => approve(r)}
                >
                  <Check className="h-3 w-3" /> {busy === r.id ? "..." : "Aprovar"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
