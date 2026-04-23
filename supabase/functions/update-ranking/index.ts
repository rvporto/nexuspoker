// Edge function: update-ranking
// Recalcula public_rankings para uma temporada agrupando participações finalizadas
// por player_ref (user_id ou temp_player_id). Salva prev_position para mostrar variação.
// Também recalcula XP e conquistas de TODOS os jogadores registrados, varrendo o
// histórico completo cronologicamente (necessário para streaks: Consistente, Back-to-Back).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ─────────────────────────────────────────────────────────────────────
// Sistema de XP e Conquistas (espelhado de src/lib/xpSystem.ts)
// ─────────────────────────────────────────────────────────────────────
const XP_PER_LEVEL = 1000;
const calcLevel = (xp: number) => Math.max(1, Math.floor((xp || 0) / XP_PER_LEVEL) + 1);

const XP_REWARDS = {
  participation: 100,
  cash_profit: 200,
  tournament_top3: 300,
  ko: 10,
};

const ACHIEVEMENT_DEFINITIONS: Record<
  string,
  { type: "unique" | "rr" | "seasonal"; xp: number; threshold?: number }
> = {
  aprendiz: { type: "unique", xp: 500, threshold: 10 },
  engajado: { type: "unique", xp: 1000, threshold: 25 },
  veterano: { type: "unique", xp: 500, threshold: 50 },
  vencedor_rr: { type: "rr", xp: 1000, threshold: 5 },
  cashman_rr: { type: "rr", xp: 500, threshold: 5 },
  consistente_rr: { type: "rr", xp: 300, threshold: 3 },
  btb_champion_rr: { type: "rr", xp: 500, threshold: 2 },
  sprinter_rr: { type: "rr", xp: 400, threshold: 1 },
  soberano_rr: { type: "seasonal", xp: 5000 },
};

interface ParticipationLite {
  game_id: string;
  profit_loss: number;
  ko_points: number;
  is_winner: boolean;
  position: number | null;
}
interface GameLite {
  id: string;
  type: "tournament" | "cash";
  date: string;
  season_year: number;
}

function calcParticipationXP(p: ParticipationLite, g?: GameLite): number {
  if (!g) return 0;
  let xp = XP_REWARDS.participation;
  if (g.type === "cash" && (p.profit_loss || 0) > 0) xp += XP_REWARDS.cash_profit;
  if (g.type === "tournament" && p.position && p.position >= 1 && p.position <= 3)
    xp += XP_REWARDS.tournament_top3;
  xp += (p.ko_points || 0) * XP_REWARDS.ko;
  return xp;
}

function calcAllAchievements(
  participations: ParticipationLite[],
  gameMap: Record<string, GameLite>,
  seasonChampionYears: number[],
  sprintsWon: number,
) {
  let baseXP = 0;
  let achievementXP = 0;
  const unlocked = new Set<string>();
  const rrCount: Record<string, number> = {};
  const rrProgress: Record<string, number> = {};

  let totalGames = 0;
  let tournamentWins = 0;
  let cashProfitGames = 0;
  let consecutiveProfit = 0;
  let consecutiveTournamentWins = 0;

  for (const p of participations) {
    const game = gameMap[p.game_id];
    if (!game) continue;

    baseXP += calcParticipationXP(p, game);
    totalGames += 1;
    const isProfit = (p.profit_loss || 0) > 0;

    if (isProfit) {
      consecutiveProfit += 1;
      if (consecutiveProfit >= 3) {
        consecutiveProfit = 0;
        rrCount.consistente_rr = (rrCount.consistente_rr || 0) + 1;
        achievementXP += ACHIEVEMENT_DEFINITIONS.consistente_rr.xp;
      }
    } else {
      consecutiveProfit = 0;
    }

    if (game.type === "cash" && isProfit) {
      cashProfitGames += 1;
      const times = Math.floor(cashProfitGames / 5);
      const prev = rrCount.cashman_rr || 0;
      if (times > prev) {
        achievementXP += (times - prev) * ACHIEVEMENT_DEFINITIONS.cashman_rr.xp;
        rrCount.cashman_rr = times;
      }
    }

    if (game.type === "tournament" && p.is_winner) {
      tournamentWins += 1;
      const times = Math.floor(tournamentWins / 5);
      const prev = rrCount.vencedor_rr || 0;
      if (times > prev) {
        achievementXP += (times - prev) * ACHIEVEMENT_DEFINITIONS.vencedor_rr.xp;
        rrCount.vencedor_rr = times;
      }
      consecutiveTournamentWins += 1;
      if (consecutiveTournamentWins >= 2) {
        rrCount.btb_champion_rr = (rrCount.btb_champion_rr || 0) + 1;
        achievementXP += ACHIEVEMENT_DEFINITIONS.btb_champion_rr.xp;
        consecutiveTournamentWins = 0;
      }
    } else if (game.type === "tournament") {
      consecutiveTournamentWins = 0;
    }
  }

  if (totalGames >= 10) { unlocked.add("aprendiz"); achievementXP += ACHIEVEMENT_DEFINITIONS.aprendiz.xp; }
  if (totalGames >= 25) { unlocked.add("engajado"); achievementXP += ACHIEVEMENT_DEFINITIONS.engajado.xp; }
  if (totalGames >= 50) { unlocked.add("veterano"); achievementXP += ACHIEVEMENT_DEFINITIONS.veterano.xp; }

  if (sprintsWon > 0) {
    rrCount.sprinter_rr = sprintsWon;
    achievementXP += sprintsWon * ACHIEVEMENT_DEFINITIONS.sprinter_rr.xp;
  }

  rrProgress.vencedor_rr = tournamentWins % 5;
  rrProgress.cashman_rr = cashProfitGames % 5;
  rrProgress.consistente_rr = consecutiveProfit;
  rrProgress.btb_champion_rr = consecutiveTournamentWins;

  const seasonalMap: Record<string, number[]> = {};
  if (seasonChampionYears.length > 0) {
    seasonalMap.soberano_rr = [...seasonChampionYears].sort();
    achievementXP += seasonChampionYears.length * ACHIEVEMENT_DEFINITIONS.soberano_rr.xp;
  }

  const totalXP = baseXP + achievementXP;
  return {
    totalXP,
    level: calcLevel(totalXP),
    achievements_unlocked: [...unlocked],
    achievements_rr_count: rrCount,
    achievements_rr_progress: rrProgress,
    achievements_seasonal: seasonalMap,
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RankRow {
  player_type: "user" | "temp";
  player_ref_id: string;
  player_nickname: string;
  player_name: string | null;
  avatar_url: string | null;
  total_points: number;
  total_profit: number;
  games_played: number;
  wins: number;
  kos: number;
  buy_ins: number;
  rebuys: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) return json({ error: "Unauthorized" }, 401);

    const { data: roleRows } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roleRows ?? []).some((r) => r.role === "admin");
    if (!isAdmin) return json({ error: "Forbidden — admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const seasonYear = Number(body.seasonYear);
    if (!Number.isInteger(seasonYear)) return json({ error: "seasonYear required" }, 400);

    // Service-role client para sobrescrever rankings ignorando RLS
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Carrega games da temporada finalizados
    const { data: games, error: gErr } = await admin
      .from("games")
      .select("id, type, season_year, status")
      .eq("season_year", seasonYear)
      .eq("status", "finished");
    if (gErr) return json({ error: gErr.message }, 500);
    const gameIds = (games ?? []).map((g) => g.id);

    // 2. Carrega participações dessas partidas
    let parts: any[] = [];
    if (gameIds.length > 0) {
      const { data: pr, error: pErr } = await admin
        .from("game_participations")
        .select("*")
        .in("game_id", gameIds);
      if (pErr) return json({ error: pErr.message }, 500);
      parts = pr ?? [];
    }

    // 3. Agrupa por player_ref
    const map = new Map<string, RankRow>();
    for (const p of parts) {
      const isUser = !!p.user_id;
      const refId = isUser ? p.user_id : p.temp_player_id;
      if (!refId) continue;
      const key = `${isUser ? "user" : "temp"}:${refId}`;
      const existing = map.get(key);
      const base: RankRow = existing ?? {
        player_type: isUser ? "user" : "temp",
        player_ref_id: refId,
        player_nickname: p.player_nickname,
        player_name: p.player_name,
        avatar_url: null,
        total_points: 0,
        total_profit: 0,
        games_played: 0,
        wins: 0,
        kos: 0,
        buy_ins: 0,
        rebuys: 0,
      };
      base.total_points += Number(p.ranking_points ?? 0);
      base.total_profit += Number(p.profit_loss ?? 0);
      base.games_played += 1;
      base.wins += p.is_winner ? 1 : 0;
      base.kos += Number(p.ko_points ?? 0);
      base.buy_ins += Number(p.entries ?? 0);
      base.rebuys += Number(p.rebuys ?? 0);
      map.set(key, base);
    }

    const rows = Array.from(map.values());

    // 4. Hidrata avatar e nome canônicos
    const userIds = rows.filter((r) => r.player_type === "user").map((r) => r.player_ref_id);
    const tempIds = rows.filter((r) => r.player_type === "temp").map((r) => r.player_ref_id);
    const [profilesRes, tempsRes] = await Promise.all([
      userIds.length
        ? admin.from("profiles").select("id, nickname, full_name, avatar_url").in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      tempIds.length
        ? admin.from("temporary_players").select("id, nickname, full_name, avatar_url").in("id", tempIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
    const tempMap = new Map((tempsRes.data ?? []).map((p) => [p.id, p]));
    rows.forEach((r) => {
      const src = r.player_type === "user" ? profileMap.get(r.player_ref_id) : tempMap.get(r.player_ref_id);
      if (src) {
        r.player_nickname = src.nickname || r.player_nickname;
        r.player_name = src.full_name || r.player_name;
        r.avatar_url = src.avatar_url ?? null;
      }
    });

    // 5. Decide métrica de ordenação
    const useProfit = seasonYear < 2026;
    rows.sort((a, b) => {
      const aMetric = useProfit ? a.total_profit : a.total_points;
      const bMetric = useProfit ? b.total_profit : b.total_points;
      if (bMetric !== aMetric) return bMetric - aMetric;
      return b.wins - a.wins;
    });

    // 6. Carrega prev_positions atuais para preservar variação
    const { data: prevRows } = await admin
      .from("public_rankings")
      .select("player_type, player_ref_id, position")
      .eq("season_year", seasonYear);
    const prevMap = new Map(
      (prevRows ?? []).map((r) => [`${r.player_type}:${r.player_ref_id}`, r.position]),
    );

    // 7. Apaga e regrava
    await admin.from("public_rankings").delete().eq("season_year", seasonYear);
    if (rows.length > 0) {
      const insertRows = rows.map((r, idx) => ({
        season_year: seasonYear,
        position: idx + 1,
        prev_position: prevMap.get(`${r.player_type}:${r.player_ref_id}`) ?? null,
        player_type: r.player_type,
        player_ref_id: r.player_ref_id,
        player_nickname: r.player_nickname,
        player_name: r.player_name,
        avatar_url: r.avatar_url,
        total_points: r.total_points,
        total_profit: r.total_profit,
        games_played: r.games_played,
        wins: r.wins,
        kos: r.kos,
        buy_ins: r.buy_ins,
        rebuys: r.rebuys,
      }));
      const { error: insErr } = await admin.from("public_rankings").insert(insertRows);
      if (insErr) return json({ error: insErr.message }, 500);
    }

    // 8. Atualiza current_rank em profiles para users
    const userRanked = rows
      .map((r, idx) => ({ ...r, position: idx + 1 }))
      .filter((r) => r.player_type === "user");
    await Promise.all(
      userRanked.map((r) =>
        admin.from("profiles").update({ current_rank: r.position }).eq("id", r.player_ref_id),
      ),
    );

    return json({ ok: true, total: rows.length, mode: useProfit ? "profit" : "points" });
  } catch (err) {
    console.error(err);
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
