// Edge function: approve-link-request
// Migra game_participations do temp_player → user_id real,
// apaga o temporary_player e marca o link_request como approved.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimErr } = await userClient.auth.getClaims(token);
    if (claimErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

    const adminCheck = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.claims.sub);
    const isAdmin = (adminCheck.data ?? []).some((r) => r.role === "admin");
    if (!isAdmin) return json({ error: "Forbidden — admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const { tempPlayerId, userId, linkRequestId } = body;
    if (!tempPlayerId || !userId) return json({ error: "tempPlayerId and userId required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Carrega profile de destino para preservar nome/nickname canônicos
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("nickname, full_name")
      .eq("id", userId)
      .maybeSingle();

    // Carrega participações do temp
    const { data: tempParts, error: tpErr } = await admin
      .from("game_participations")
      .select("id, game_id")
      .eq("temp_player_id", tempPlayerId);
    if (tpErr) return json({ error: tpErr.message }, 500);

    // Verifica conflito: usuário real já participa em alguma dessas partidas?
    if ((tempParts ?? []).length > 0) {
      const gameIds = tempParts!.map((p) => p.game_id);
      const { data: conflicts } = await admin
        .from("game_participations")
        .select("id, game_id")
        .eq("user_id", userId)
        .in("game_id", gameIds);
      if (conflicts && conflicts.length > 0) {
        return json({
          error: "Conflito: o usuário já participa de algumas partidas atribuídas ao temporário",
          conflictingGameIds: conflicts.map((c) => c.game_id),
        }, 409);
      }
    }

    // Migra
    const { error: migrErr } = await admin
      .from("game_participations")
      .update({
        user_id: userId,
        temp_player_id: null,
        player_nickname: targetProfile?.nickname ?? undefined,
        player_name: targetProfile?.full_name ?? undefined,
      })
      .eq("temp_player_id", tempPlayerId);
    if (migrErr) return json({ error: migrErr.message }, 500);

    // Atualiza link request se houver
    if (linkRequestId) {
      await admin
        .from("link_requests")
        .update({
          status: "approved",
          resolved_at: new Date().toISOString(),
          resolved_by: claims.claims.sub,
        })
        .eq("id", linkRequestId);
    }

    // Apaga temp player
    await admin.from("temporary_players").delete().eq("id", tempPlayerId);

    return json({ ok: true, migratedCount: (tempParts ?? []).length });
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
