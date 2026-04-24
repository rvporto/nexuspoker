import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import RankMovementBadge from "@/components/RankMovementBadge";
import RankingReport, { type ReportRow } from "@/components/RankingReport";
import PodiumCard from "@/components/PodiumCard";
import SeasonTabs from "@/components/SeasonTabs";
import LevelBadge from "@/components/LevelBadge";
import PlayerSummaryModal from "@/components/PlayerSummaryModal";
import { formatBRL, formatPoints, initials } from "@/lib/format";
import { AlertTriangle, Crown, Download, FileDown, Flag, LinkIcon, RefreshCw, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
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
  const [closingSeason, setClosingSeason] = useState(false);
  const [champions, setChampions] = useState<Record<number, { nickname: string; avatar_url: string | null }>>({});
  const [levelMap, setLevelMap] = useState<Map<string, number>>(new Map());
  const reportRef = useRef<HTMLDivElement>(null);
  const [summaryPlayer, setSummaryPlayer] = useState<{ type: "user" | "temp"; refId: string; nickname: string; avatar_url: string | null } | null>(null);

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
    const { data: gamesYears } = await supabase.from("games").select("season_year");
    (gamesYears ?? []).forEach((g) => { if (!ys.includes(g.season_year)) ys.push(g.season_year); });
    if (ys.length === 0) ys.push(new Date().getFullYear());
    ys.sort((a, b) => b - a);
    setSeasons(ys);
    setRows(allRows);

    // Levels dos jogadores registrados
    const userIds = Array.from(new Set(allRows.filter((r) => r.player_type === "user").map((r) => r.player_ref_id)));
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, level").in("id", userIds);
      setLevelMap(new Map((profs ?? []).map((p: any) => [p.id, p.level ?? 1])));
    } else {
      setLevelMap(new Map());
    }
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

  async function loadChampions() {
    const { data } = await supabase
      .from("season_champions")
      .select("season_year, champion_nickname, champion_avatar_url");
    const map: Record<number, { nickname: string; avatar_url: string | null }> = {};
    (data ?? []).forEach((c: any) => {
      map[c.season_year] = { nickname: c.champion_nickname, avatar_url: c.champion_avatar_url };
    });
    setChampions(map);
  }

  useEffect(() => { loadAll(); loadChampions(); }, []);
  useEffect(() => { loadPendingRequests(); }, [isAdmin]);
  useEffect(() => {
    if (season === null && seasons.length > 0) setSeason(seasons[0]);
  }, [seasons, season]);

  const closedYears = useMemo(() => new Set(Object.keys(champions).map(Number)), [champions]);


  async function closeSeason() {
    if (season === null || currentRows.length === 0) return;
    if (!confirm(`Encerrar a temporada ${season}? O atual líder será marcado como Campeão.`)) return;
    const champ = currentRows[0];
    setClosingSeason(true);
    const useProfit = season < 2026;
    const { error } = await supabase.from("season_champions").upsert({
      season_year: season,
      champion_player_type: champ.player_type,
      champion_player_ref_id: champ.player_ref_id,
      champion_nickname: champ.player_nickname,
      champion_avatar_url: (champ as any).avatar_url ?? null,
      champion_metric_value: useProfit ? champ.total_profit : champ.total_points,
      metric_mode: useProfit ? "profit" : "points",
      closed_by: user?.id ?? null,
    }, { onConflict: "season_year" });
    setClosingSeason(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(`Temporada ${season} encerrada! ${champ.player_nickname} é o Campeão.`);
    loadChampions();
  }

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
                : "Aprovar ou rejeitar solicitações."}
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3 border-primary/40 text-primary hover:bg-primary/10">
              <Link to="/admin/vinculos">Abrir lista</Link>
            </Button>
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
          <SeasonTabs seasons={seasons} value={season} onChange={setSeason} closedYears={closedYears} />
        )}
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10" disabled={closingSeason || currentRows.length === 0 || (season !== null && closedYears.has(season))} onClick={closeSeason}>
              <Flag className="h-4 w-4" /> {closingSeason ? "Encerrando..." : (season !== null && closedYears.has(season)) ? "Temporada encerrada" : "Encerrar temporada"}
            </Button>
          )}
          <Button size="sm" variant="outline" className="border-primary/30 text-foreground hover:bg-primary/10" disabled={currentRows.length === 0} onClick={() => setReportOpen(true)}>
            <FileDown className="h-4 w-4" /> Relatório
          </Button>
        </div>
      </div>

      {loading && <div className="nexus-card p-10 text-center text-sm text-muted-foreground">Carregando...</div>}

      {!loading && currentRows.length === 0 && (
        <div className="nexus-card p-10 text-center text-sm text-muted-foreground">
          Nenhum jogador no ranking ainda.{isAdmin && " Finalize partidas e clique em 'Recalcular agora'."}
        </div>
      )}

      {podium.length > 0 && (
        <section className="nexus-card p-5">
          <div className="mb-6 flex items-center justify-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Pódio dos Campeões</h2>
          </div>
          <div className="grid grid-cols-3 items-end gap-3 sm:gap-5">
            {[podium[1], podium[0], podium[2]].filter(Boolean).map((row) => {
              const place = (row.position as 1 | 2 | 3);
              const isMe = !!user && row.player_type === "user" && row.player_ref_id === user.id;
              const champ = season ? champions[season] : null;
              const isClosedChampion = !!champ && place === 1 && champ.nickname === row.player_nickname;
              return (
                <PodiumCard
                  key={row.id}
                  place={place}
                  metric={metric as "profit" | "points"}
                  championYear={isClosedChampion ? season : null}
                  entry={{
                    id: row.id,
                    player_nickname: row.player_nickname,
                    avatar_url: (row as any).avatar_url ?? null,
                    total_points: row.total_points,
                    total_profit: row.total_profit,
                    games_played: row.games_played,
                    wins: row.wins,
                    level: row.player_type === "user" ? (levelMap.get(row.player_ref_id) ?? 1) : 1,
                    is_me: isMe,
                  }}
                />
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
            const isMe = !!user && row.player_type === "user" && row.player_ref_id === user.id;
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold">{row.player_nickname}</span>
                    {row.player_type === "user" && levelMap.get(row.player_ref_id) !== undefined && (
                      <LevelBadge level={levelMap.get(row.player_ref_id)!} size="sm" />
                    )}
                    {isMe && (
                      <span className="nexus-chip bg-primary/20 px-1.5 text-[10px] font-bold text-primary">Você</span>
                    )}
                    {isTemp && (
                      <span className="nexus-chip bg-secondary text-[10px] text-muted-foreground">Temporário</span>
                    )}
                    {isTemp && isAdmin && (
                      <Button
                        size="sm" variant="outline"
                        className="h-6 border-primary/40 px-2 py-0 text-[10px] text-primary hover:bg-primary/10"
                        onClick={() => openLinkDialog(row.player_ref_id, row.player_nickname)}
                      >
                        <LinkIcon className="h-3 w-3" /> Vincular
                      </Button>
                    )}
                    {isTemp && !isAdmin && isLoggedIn && (
                      <Button
                        size="sm" variant="outline"
                        className="h-6 border-primary/40 px-2 py-0 text-[10px] text-primary hover:bg-primary/10"
                        disabled={hasPendingFromMe}
                        onClick={() => requestLink(row.player_ref_id)}
                      >
                        <UserCheck className="h-3 w-3" /> {hasPendingFromMe ? "Pendente" : "Solicitar"}
                      </Button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {row.games_played} partidas · {row.wins} vitórias · {row.kos} KOs
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-bold ${
                      metric === "points"
                        ? "text-primary"
                        : row.total_profit > 0
                          ? "text-success"
                          : row.total_profit < 0
                            ? "text-destructive"
                            : "text-muted-foreground"
                    }`}
                  >
                    {metric === "points" ? `${formatPoints(row.total_points)} pts` : formatBRL(row.total_profit)}
                  </div>
                </div>
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

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-[95vw] max-h-[92vh] overflow-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="nexus-text-gold">Relatório do Ranking — Temporada {season}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto rounded-lg border border-border" style={{ maxHeight: "70vh" }}>
            <div style={{ transform: "scale(0.55)", transformOrigin: "top left", width: 1200 }}>
              <RankingReport
                ref={reportRef}
                season={season ?? new Date().getFullYear()}
                metric={metric as "points" | "profit"}
                rows={currentRows.map((r) => ({
                  id: r.id,
                  position: r.position,
                  player_nickname: r.player_nickname,
                  avatar_url: (r as any).avatar_url ?? null,
                  total_points: r.total_points,
                  total_profit: r.total_profit,
                  games_played: r.games_played,
                  wins: r.wins,
                  kos: r.kos,
                })) as ReportRow[]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Fechar</Button>
            <Button onClick={downloadReport} disabled={downloading} className="bg-gradient-gold text-primary-foreground">
              <Download className="h-4 w-4" /> {downloading ? "Gerando..." : "Baixar JPEG"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
