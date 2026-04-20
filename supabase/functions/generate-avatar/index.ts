// Edge function: generate-avatar
// Gera uma imagem de avatar via Lovable AI Gateway (Nano Banana).
// Retorna base64 — o cliente decide se faz upload no bucket `avatars`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PROMPT =
  "Stylized portrait avatar of a poker player, cinematic lighting, dark background with subtle gold accents, professional, high detail, square framing, painterly digital art";

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

    const body = await req.json().catch(() => ({}));
    const userPrompt = (body?.prompt ?? "").toString().trim();
    const finalPrompt = userPrompt
      ? `${DEFAULT_PROMPT}. Style: ${userPrompt}`
      : DEFAULT_PROMPT;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI key not configured" }, 500);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: finalPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (aiResp.status === 429) return json({ error: "Limite de requisições. Tente novamente em alguns segundos." }, 429);
    if (aiResp.status === 402) return json({ error: "Sem créditos para IA. Adicione créditos no workspace Lovable." }, 402);
    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      return json({ error: "Falha ao gerar avatar" }, 500);
    }

    const data = await aiResp.json();
    const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;
    if (!imageUrl) return json({ error: "Resposta sem imagem" }, 500);

    return json({ imageUrl });
  } catch (e) {
    console.error("generate-avatar exception", e);
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
