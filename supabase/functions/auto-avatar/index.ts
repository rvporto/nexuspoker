// Edge function: auto-avatar
// Gera avatares por IA conforme gênero e os salva no bucket `avatars`,
// atualizando profiles ou temporary_players.
//
// Modos suportados (no body):
//   { mode: "single", target: "user"|"temp", id: "<uuid>", gender?: "male"|"female"|"other" }
//   { mode: "batch", limit?: 20 }   -> backfill (apenas admin), processa todos sem avatar
//
// Apenas usuários autenticados podem acionar; backfill exige role admin.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Gender = "male" | "female" | "other";

function promptForGender(g: Gender | null | undefined): string {
  const base =
    "Stylized portrait avatar of a poker player, cinematic lighting, dark casino background with subtle gold accents, high detail, square framing, painterly digital art, focused expression";
  if (g === "male") return `${base}, adult male character`;
  if (g === "female") return `${base}, adult female character`;
  // other / null: random adult character
  const flip = Math.random() < 0.5 ? "male" : "female";
  return `${base}, adult ${flip} character, mysterious mood`;
}

async function generateAvatarBytes(prompt: string, apiKey: string): Promise<Uint8Array | null> {
  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!aiResp.ok) {
    console.error("AI gateway error", aiResp.status, await aiResp.text());
    return null;
  }
  const data = await aiResp.json();
  const url: string | undefined =
    data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) return null;
  // url is data:image/png;base64,XXXX
  const commaIdx = url.indexOf(",");
  if (commaIdx < 0) return null;
  return base64Decode(url.slice(commaIdx + 1));
}

async function uploadAndAssign(
  admin: ReturnType<typeof createClient>,
  target: "user" | "temp",
  id: string,
  bytes: Uint8Array,
): Promise<string | null> {
  const path = `${target === "user" ? id : `temp/${id}`}/avatar-auto-${Date.now()}.png`;
  const { error: upErr } = await admin.storage
    .from("avatars")
    .upload(path, bytes, { upsert: true, contentType: "image/png" });
  if (upErr) {
    console.error("upload error", upErr);
    return null;
  }
  const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
  const url = pub.publicUrl;

  if (target === "user") {
    await admin.from("profiles").update({ avatar_url: url }).eq("id", id);
    await admin
      .from("public_rankings")
      .update({ avatar_url: url })
      .eq("player_ref_id", id)
      .eq("player_type", "user");
  } else {
    await admin.from("temporary_players").update({ avatar_url: url }).eq("id", id);
    await admin
      .from("public_rankings")
      .update({ avatar_url: url })
      .eq("player_ref_id", id)
      .eq("player_type", "temp");
  }
  return url;
}

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
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) return json({ error: "Unauthorized" }, 401);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI key not configured" }, 500);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "batch" ? "batch" : "single";

    if (mode === "single") {
      const target = body?.target as "user" | "temp";
      const id = body?.id as string;
      const gender = (body?.gender ?? null) as Gender | null;
      if (!target || !id) return json({ error: "target and id required" }, 400);

      // Permissão: usuário pode gerar para si mesmo; admin pode gerar para qualquer um
      const { data: roles } = await userClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      if (!isAdmin && !(target === "user" && id === userData.user.id)) {
        return json({ error: "Forbidden" }, 403);
      }

      const bytes = await generateAvatarBytes(promptForGender(gender), apiKey);
      if (!bytes) return json({ error: "Falha ao gerar imagem" }, 500);
      const url = await uploadAndAssign(admin, target, id, bytes);
      if (!url) return json({ error: "Falha ao salvar" }, 500);
      return json({ ok: true, avatar_url: url });
    }

    // BATCH: apenas admin
    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) return json({ error: "Forbidden — admin only" }, 403);

    const limit = Math.max(1, Math.min(20, Number(body?.limit ?? 8)));

    // Pega N profiles sem avatar
    const { data: profilesNeed } = await admin
      .from("profiles")
      .select("id, gender, avatar_url")
      .is("avatar_url", null)
      .limit(limit);

    // Pega N temps sem avatar
    const remaining = Math.max(0, limit - (profilesNeed?.length ?? 0));
    const { data: tempsNeed } = remaining > 0
      ? await admin
          .from("temporary_players")
          .select("id, gender, avatar_url")
          .is("avatar_url", null)
          .limit(remaining)
      : { data: [] as any[] };

    const tasks: Array<{ target: "user" | "temp"; id: string; gender: Gender | null }> = [
      ...(profilesNeed ?? []).map((p: any) => ({
        target: "user" as const,
        id: p.id,
        gender: p.gender as Gender | null,
      })),
      ...(tempsNeed ?? []).map((t: any) => ({
        target: "temp" as const,
        id: t.id,
        gender: t.gender as Gender | null,
      })),
    ];

    const results: Array<{ target: string; id: string; ok: boolean; url?: string; error?: string }> = [];
    for (const t of tasks) {
      try {
        const bytes = await generateAvatarBytes(promptForGender(t.gender), apiKey);
        if (!bytes) {
          results.push({ ...t, ok: false, error: "no image" });
          continue;
        }
        const url = await uploadAndAssign(admin, t.target, t.id, bytes);
        if (!url) {
          results.push({ ...t, ok: false, error: "upload failed" });
          continue;
        }
        results.push({ ...t, ok: true, url });
        // pequeno delay para evitar rate limit
        await new Promise((r) => setTimeout(r, 600));
      } catch (e) {
        results.push({ ...t, ok: false, error: String(e) });
      }
    }

    return json({ ok: true, processed: results.length, results });
  } catch (e) {
    console.error("auto-avatar exception", e);
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
