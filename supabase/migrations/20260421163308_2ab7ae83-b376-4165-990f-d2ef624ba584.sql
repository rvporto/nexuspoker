-- Tabela de campeões por temporada encerrada
CREATE TABLE public.season_champions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_year INTEGER NOT NULL UNIQUE,
  champion_player_type public.player_ref_type NOT NULL,
  champion_player_ref_id UUID NOT NULL,
  champion_nickname TEXT NOT NULL,
  champion_avatar_url TEXT,
  champion_metric_value NUMERIC NOT NULL DEFAULT 0,
  metric_mode TEXT NOT NULL DEFAULT 'profit',
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_by UUID
);

ALTER TABLE public.season_champions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Champions are viewable by everyone"
  ON public.season_champions FOR SELECT
  USING (true);

CREATE POLICY "Admins manage champions"
  ON public.season_champions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Atualizar trigger handle_new_user para também garantir avatar randômico via flag
-- (avatar real é gerado pela edge function auto-avatar; aqui só garantimos que o handler segue o mesmo)
