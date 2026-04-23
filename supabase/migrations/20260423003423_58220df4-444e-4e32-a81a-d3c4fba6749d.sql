ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS experience_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS achievements_unlocked text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS achievements_rr_count jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS achievements_rr_progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS achievements_seasonal jsonb NOT NULL DEFAULT '{}'::jsonb;