// Edge function: update-ranking
// Recalcula public_rankings para uma temporada agrupando participações finalizadas
// por player_ref (user_id ou temp_player_id). Salva prev_position para mostrar variação.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    const { data: claims, error: claimErr } = await userClient.auth.getClaims(token);
    if (claimErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

    const { data: roleRows } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.claims.sub);
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
