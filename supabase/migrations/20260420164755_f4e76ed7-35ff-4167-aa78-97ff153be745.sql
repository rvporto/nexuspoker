
-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.game_type AS ENUM ('tournament', 'cash');
CREATE TYPE public.game_status AS ENUM ('scheduled', 'finished');
CREATE TYPE public.link_request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.player_gender AS ENUM ('male', 'female', 'other');
CREATE TYPE public.player_ref_type AS ENUM ('user', 'temp');

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  gender public.player_gender,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  profile_completed BOOLEAN NOT NULL DEFAULT false,
  current_rank INTEGER,
  achievements TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================
-- USER ROLES
-- =========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function (SECURITY DEFINER to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- =========================================
-- GAMES
-- =========================================
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.game_type NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  season_year INTEGER NOT NULL,
  buy_in NUMERIC(10,2) NOT NULL,
  rebuy_value NUMERIC(10,2) NOT NULL,
  status public.game_status NOT NULL DEFAULT 'scheduled',
  total_pot NUMERIC(10,2) NOT NULL DEFAULT 0,
  house_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- =========================================
-- TEMPORARY PLAYERS
-- =========================================
CREATE TABLE public.temporary_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  gender public.player_gender,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.temporary_players ENABLE ROW LEVEL SECURITY;

-- =========================================
-- GAME PARTICIPATIONS
-- =========================================
CREATE TABLE public.game_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  temp_player_id UUID REFERENCES public.temporary_players(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_nickname TEXT NOT NULL,
  entries INTEGER NOT NULL DEFAULT 1,
  rebuys INTEGER NOT NULL DEFAULT 0,
  total_invested NUMERIC(10,2) NOT NULL DEFAULT 0,
  final_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  profit_loss NUMERIC(10,2) NOT NULL DEFAULT 0,
  profit_percentage NUMERIC(10,2) NOT NULL DEFAULT 0,
  position INTEGER,
  is_winner BOOLEAN NOT NULL DEFAULT false,
  ko_points INTEGER NOT NULL DEFAULT 0,
  ranking_points NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT participation_one_player_ref CHECK (
    (user_id IS NOT NULL AND temp_player_id IS NULL) OR
    (user_id IS NULL AND temp_player_id IS NOT NULL)
  )
);
ALTER TABLE public.game_participations ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_participations_game ON public.game_participations(game_id);
CREATE INDEX idx_participations_user ON public.game_participations(user_id);
CREATE INDEX idx_participations_temp ON public.game_participations(temp_player_id);

-- =========================================
-- LINK REQUESTS
-- =========================================
CREATE TABLE public.link_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  temp_player_id UUID NOT NULL REFERENCES public.temporary_players(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.link_request_status NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (temp_player_id, user_id, status)
);
ALTER TABLE public.link_requests ENABLE ROW LEVEL SECURITY;

-- =========================================
-- PUBLIC RANKINGS
-- =========================================
CREATE TABLE public.public_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_year INTEGER NOT NULL,
  player_type public.player_ref_type NOT NULL,
  player_ref_id UUID NOT NULL,
  player_nickname TEXT NOT NULL,
  player_name TEXT,
  avatar_url TEXT,
  position INTEGER NOT NULL,
  prev_position INTEGER,
  total_points NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_profit NUMERIC(10,2) NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  kos INTEGER NOT NULL DEFAULT 0,
  buy_ins INTEGER NOT NULL DEFAULT 0,
  rebuys INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_year, player_type, player_ref_id)
);
ALTER TABLE public.public_rankings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_rankings_season ON public.public_rankings(season_year, position);

-- =========================================
-- updated_at trigger function
-- =========================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_games_updated BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_participations_updated BEFORE UPDATE ON public.game_participations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- handle_new_user trigger
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, nickname)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'nickname', '')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- RLS POLICIES
-- =========================================

-- PROFILES: público lê, dono edita, admin tudo
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- USER ROLES: público lê (precisa para checar admin), só admin gerencia
CREATE POLICY "Roles are viewable by everyone"
  ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- GAMES: público lê, admin gerencia
CREATE POLICY "Games are viewable by everyone"
  ON public.games FOR SELECT USING (true);
CREATE POLICY "Admins manage games"
  ON public.games FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- TEMPORARY PLAYERS: público lê, admin gerencia
CREATE POLICY "Temp players are viewable by everyone"
  ON public.temporary_players FOR SELECT USING (true);
CREATE POLICY "Admins manage temp players"
  ON public.temporary_players FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- GAME PARTICIPATIONS: público lê, admin gerencia
CREATE POLICY "Participations are viewable by everyone"
  ON public.game_participations FOR SELECT USING (true);
CREATE POLICY "Admins manage participations"
  ON public.game_participations FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- LINK REQUESTS: usuário lê/cria as próprias, admin lê/gerencia tudo
CREATE POLICY "Users see own link requests"
  ON public.link_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins see all link requests"
  ON public.link_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own link requests"
  ON public.link_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update link requests"
  ON public.link_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete link requests"
  ON public.link_requests FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- PUBLIC RANKINGS: público lê, admin gerencia
CREATE POLICY "Rankings are viewable by everyone"
  ON public.public_rankings FOR SELECT USING (true);
CREATE POLICY "Admins manage rankings"
  ON public.public_rankings FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
