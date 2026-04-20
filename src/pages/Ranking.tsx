import { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import RankMovementBadge from "@/components/RankMovementBadge";
import RankingReport, { type ReportRow } from "@/components/RankingReport";
import { formatBRL, initials } from "@/lib/format";
import { AlertTriangle, Crown, Download, FileDown, LinkIcon, RefreshCw, UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { toJpeg } from "html-to-image";

type Row = {
  id: string;
  player_type: "user" | "temp";
  player_ref_id: string;
  player_nickname: string;
  player_name: string | null;
  avatar_url: string | null;
  position: number;
  prev_position: number | null;
  total_points: number;
  total_profit: number;
  games_played: number;
  wins: number;
  kos: number;
  buy_ins: number;
  rebuys: number;
};

type LinkRequest = {
  id: string;
  user_id: string;
  temp_player_id: string;
  status: "pending" | "approved" | "rejected";
};

export default function Ranking() {
  const { isLoggedIn, isAdmin, user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [seasons, setSeasons] = useState<number[]>([]);
  const [season, setSeason] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<LinkRequest[]>([]);
  const [linkDialog, setLinkDialog] = useState<{ tempId: string; nickname: string } | null>(null);
  const [linkUserSearch, setLinkUserSearch] = useState("");
  const [profilesForLink, setProfilesForLink] = useState<{ id: string; nickname: string | null; full_name: string | null }[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  async function downloadReport() {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toJpeg(reportRef.current, { quality: 0.95, pixelRatio: 2, backgroundColor: "#0a0a0a" });
      const link = document.createElement("a");
      link.download = `ranking-nexus-${season}.jpg`;
      link.href = dataUrl;
      link.click();
      toast.success("Relatório baixado");
    } catch (e: any) {
      toast.error("Falha ao gerar JPEG: " + (e?.message ?? ""));
    } finally {
      setDownloading(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    const { data: rk } = await supabase.from("public_rankings").select("*");
    const allRows = (rk ?? []) as Row[];
    const ys = Array.from(new Set(allRows.map((r) => (r as any).season_year as number)));
    // include current year + game years (in case ranking ainda não existe)
    const { data: gamesYears } = await supabase.from("games").select("season_year");
    (gamesYears ?? []).forEach((g) => { if (!ys.includes(g.season_year)) ys.push(g.season_year); });
    if (ys.length === 0) ys.push(new Date().getFullYear());
    ys.sort((a, b) => b - a);
    setSeasons(ys);
    setRows(allRows);
    setLoading(false);
  }

  async function loadPendingRequests() {
    if (!isAdmin) return;
    const { data } = await supabase
      .from("link_requests")
      .select("id, user_id, temp_player_id, status")
      .eq("status", "pending");
    setPendingRequests((data ?? []) as LinkRequest[]);
  }

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadPendingRequests(); }, [isAdmin]);
  useEffect(() => {
    if (season === null && seasons.length > 0) setSeason(seasons[0]);
  }, [seasons, season]);

  const currentRows = useMemo(
    () => rows.filter((r) => (r as any).season_year === season).sort((a, b) => a.position - b.position),
    [rows, season],
  );
  const metric = (season ?? 0) >= 2026 ? "points" : "profit";
  const podium = currentRows.slice(0, 3);

  async function recalc() {
    if (season === null) return;
    setRefreshing(true);
    const { data, error } = await supabase.functions.invoke("update-ranking", {
      body: { seasonYear: season },
    });
    setRefreshing(false);
    if (error) { toast.error("Erro ao recalcular: " + error.message); return; }
    toast.success(`Ranking atualizado (${data?.total ?? 0} jogadores, modo ${data?.mode})`);
    loadAll();
  }

  async function requestLink(tempPlayerId: string) {
    if (!user) { toast.error("Faça login primeiro"); return; }
    const { error } = await supabase.from("link_requests").insert({
      user_id: user.id,
      temp_player_id: tempPlayerId,
    });
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Solicitação de vínculo enviada ao admin");
  }

  async function openLinkDialog(tempId: string, nickname: string) {
    const { data } = await supabase.from("profiles").select("id, nickname, full_name").limit(200);
    setProfilesForLink(data ?? []);
    setLinkDialog({ tempId, nickname });
  }

  async function confirmLink(userId: string) {
    if (!linkDialog) return;
    const pendingReq = pendingRequests.find(
      (r) => r.temp_player_id === linkDialog.tempId && r.user_id === userId,
    );
    const { data, error } = await supabase.functions.invoke("approve-link-request", {
      body: {
        tempPlayerId: linkDialog.tempId,
        userId,
        linkRequestId: pendingReq?.id,
      },
    });
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(`Vinculado! ${data?.migratedCount ?? 0} partidas migradas`);
    setLinkDialog(null);
    setLinkUserSearch("");
    loadAll();
    loadPendingRequests();
    if (season !== null) recalc();
  }

  const filteredProfiles = profilesForLink.filter(
    (p) =>
      (p.nickname ?? "").toLowerCase().includes(linkUserSearch.toLowerCase()) ||
      (p.full_name ?? "").toLowerCase().includes(linkUserSearch.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold nexus-text-gold">Ranking</h1>
        <p className="text-sm text-muted-foreground">
          {(season ?? 0) >= 2026
            ? "Sistema de pontos: PBT × FM + KO para torneios e PBC × FP + 5 + KO para cash games."
            : "Temporada legada — classificação por lucro total acumulado."}
        </p>
      </header>

      {isAdmin && (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="nexus-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><RefreshCw className="h-4 w-4 text-primary" /> Atualizar ranking</div>
            <p className="text-xs text-muted-foreground">Recalcula posições com base nas partidas finalizadas.</p>
            <Button size="sm" variant="outline" className="mt-3 border-primary/40 text-primary hover:bg-primary/10" disabled={refreshing} onClick={recalc}>
              {refreshing ? "Recalculando..." : "Recalcular agora"}
            </Button>
          </div>
          <div className="nexus-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <LinkIcon className="h-4 w-4 text-primary" /> Vínculos pendentes
              {pendingRequests.length > 0 && (
                <span className="ml-auto nexus-chip bg-primary/20 text-primary">{pendingRequests.length}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingRequests.length === 0
                ? "Nenhum pedido no momento."
                : "Clique em 'Vincular' nos jogadores temporários abaixo."}
            </p>
          </div>
          <div className="nexus-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive"><AlertTriangle className="h-4 w-4" /> Zona de perigo</div>
            <p className="text-xs text-muted-foreground">Resetar zera <code>prev_position</code> da temporada.</p>
            <Button
              size="sm" variant="outline"
              className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={async () => {
                if (season === null) return;
                if (!confirm("Apagar o ranking desta temporada?")) return;
                const { error } = await supabase.from("public_rankings").delete().eq("season_year", season);
                if (error) { toast.error(error.message); return; }
                toast.success("Ranking apagado. Recalcule para regenerar.");
                loadAll();
              }}
            >
              Resetar ranking
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {seasons.length > 0 && season !== null && (
          <Tabs value={String(season)} onValueChange={(v) => setSeason(Number(v))}>
            <TabsList className="bg-secondary">
              {seasons.map((s) => (
                <TabsTrigger key={s} value={String(s)}>Temporada {s}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
        <Button size="sm" variant="outline" className="border-primary/30 text-foreground hover:bg-primary/10" disabled={currentRows.length === 0} onClick={() => setReportOpen(true)}>
          <FileDown className="h-4 w-4" /> Relatório
        </Button>
      </div>

      {loading && <div className="nexus-card p-10 text-center text-sm text-muted-foreground">Carregando...</div>}

      {!loading && currentRows.length === 0 && (
        <div className="nexus-card p-10 text-center text-sm text-muted-foreground">
          Nenhum jogador no ranking ainda.{isAdmin && " Finalize partidas e clique em 'Recalcular agora'."}
        </div>
      )}

      {podium.length > 0 && (
        <section className="nexus-card p-5">
          <div className="mb-4 flex items-center gap-2"><Crown className="h-5 w-5 text-primary" /><h2 className="text-lg font-bold">Pódio</h2></div>
          <div className="grid grid-cols-3 items-end gap-3">
            {[podium[1], podium[0], podium[2]].filter(Boolean).map((row, idx) => {
              const place = idx === 1 ? 1 : idx === 0 ? 2 : 3;
              const heights = ["h-24", "h-32", "h-20"];
              return (
                <div key={row.id} className="flex flex-col items-center gap-2">
                  <Avatar className="h-14 w-14 border-2 border-primary/60">
                    {(row as any).avatar_url && <AvatarImage src={(row as any).avatar_url} alt={row.player_nickname} />}
                    <AvatarFallback className="bg-secondary">{initials(row.player_nickname)}</AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <div className="max-w-[120px] truncate text-sm font-semibold">{row.player_nickname}</div>
                    <div className="text-xs font-bold text-primary">
                      {metric === "points" ? `${row.total_points} pts` : formatBRL(row.total_profit)}
                    </div>
                  </div>
                  <div className={`${heights[idx]} flex w-full items-start justify-center rounded-t-lg bg-gradient-gold pt-2`}>
                    <span className="text-base font-bold text-primary-foreground">{place}º</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {currentRows.length > 0 && (
        <section className="nexus-card divide-y divide-border">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Classificação completa</h2>
            <span className="text-xs text-muted-foreground">{currentRows.length} jogadores</span>
          </div>
          {currentRows.map((row) => {
            const isTemp = row.player_type === "temp";
            const hasPendingFromMe = isTemp && pendingRequests.some(
              (r) => r.temp_player_id === row.player_ref_id && r.user_id === user?.id,
            );
            const isTop3 = row.position <= 3;
            return (
              <div key={row.id} className={`flex items-center gap-3 p-4 ${isTop3 ? "bg-primary/5" : ""}`}>
                <div className="flex w-14 items-center gap-2">
                  <span className={`text-lg font-bold ${isTop3 ? "text-primary" : "text-muted-foreground"}`}>{row.position}º</span>
                  <RankMovementBadge current={row.position} previous={row.prev_position ?? undefined} />
                </div>
                <Avatar className={`h-10 w-10 border ${isTop3 ? "border-primary/60" : "border-border"}`}>
                  {(row as any).avatar_url && <AvatarImage src={(row as any).avatar_url} alt={row.player_nickname} />}
                  <AvatarFallback className="bg-secondary">{initials(row.player_nickname)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{row.player_nickname}</span>
                    {isTemp && <span className="nexus-chip bg-secondary text-[10px] text-muted-foreground">Temporário</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {row.games_played} partidas · {row.wins} vitórias · {row.kos} KOs
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">
                    {metric === "points" ? `${row.total_points} pts` : formatBRL(row.total_profit)}
                  </div>
                  {metric === "points" && (
                    <div className={`text-xs ${row.total_profit >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatBRL(row.total_profit)}
                    </div>
                  )}
                </div>
                {isTemp && isAdmin && (
                  <Button
                    size="sm" variant="outline"
                    className="border-primary/40 text-primary hover:bg-primary/10"
                    onClick={() => openLinkDialog(row.player_ref_id, row.player_nickname)}
                  >
                    <LinkIcon className="h-3 w-3" /> Vincular
                  </Button>
                )}
                {isTemp && !isAdmin && isLoggedIn && (
                  <Button
                    size="sm" variant="outline"
                    className="border-primary/40 text-primary hover:bg-primary/10"
                    disabled={hasPendingFromMe}
                    onClick={() => requestLink(row.player_ref_id)}
                  >
                    <UserCheck className="h-3 w-3" /> {hasPendingFromMe ? "Pendente" : "Solicitar"}
                  </Button>
                )}
              </div>
            );
          })}
        </section>
      )}

      <Dialog open={!!linkDialog} onOpenChange={(o) => !o && setLinkDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular "{linkDialog?.nickname}" a uma conta</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Buscar por nickname ou nome..."
            value={linkUserSearch}
            onChange={(e) => setLinkUserSearch(e.target.value)}
          />
          <div className="max-h-72 overflow-y-auto rounded-lg border border-border bg-background-mid">
            {filteredProfiles.length === 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">Nenhum usuário encontrado.</div>
            )}
            {filteredProfiles.map((p) => {
              const isPending = pendingRequests.some(
                (r) => r.temp_player_id === linkDialog?.tempId && r.user_id === p.id,
              );
              return (
                <button
                  key={p.id}
                  className="flex w-full items-center gap-3 p-3 text-left hover:bg-secondary"
                  onClick={() => confirmLink(p.id)}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-gold text-[11px] font-bold text-primary-foreground">
                    {initials(p.nickname || p.full_name || "?")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.nickname || "(sem nick)"}</div>
                    {p.full_name && <div className="truncate text-[11px] text-muted-foreground">{p.full_name}</div>}
                  </div>
                  {isPending && <span className="nexus-chip bg-primary/20 text-[10px] text-primary">solicitou</span>}
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog(null)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
