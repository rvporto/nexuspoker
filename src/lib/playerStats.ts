import { supabase } from "@/integrations/supabase/client";

export type PlayerHistoryItem = {
  game_id: string;
  game_name: string;
  game_type: "tournament" | "cash";
  date: string;
  season_year: number;
  position: number | null;
  profit_loss: number;
  ranking_points: number;
  ko_points: number;
  is_winner: boolean;
};

export type PlayerStats = {
  games: number;
  wins: number;
  kos: number;
  buyIns: number;
  rebuys: number;
  totalProfit: number;
  totalPoints: number;
  history: PlayerHistoryItem[];
};

const EMPTY: PlayerStats = {
  games: 0, wins: 0, kos: 0, buyIns: 0, rebuys: 0,
  totalProfit: 0, totalPoints: 0, history: [],
};

/**
 * Coleta estatísticas de um jogador (real ou temporário) em uma temporada.
 * Se seasonYear for omitido, considera todas as temporadas.
 */
export async function getPlayerStats(opts: {
  userId?: string | null;
  tempPlayerId?: string | null;
  seasonYear?: number;
}): Promise<PlayerStats> {
  const { userId, tempPlayerId, seasonYear } = opts;
  if (!userId && !tempPlayerId) return EMPTY;

  let q = supabase
    .from("game_participations")
    .select(
      "entries, rebuys, profit_loss, ranking_points, ko_points, position, is_winner, games!inner(id, name, type, date, season_year)",
    );

  if (userId) q = q.eq("user_id", userId);
  if (tempPlayerId) q = q.eq("temp_player_id", tempPlayerId);

  const { data, error } = await q;
  if (error || !data) return EMPTY;

  const filtered = seasonYear
    ? data.filter((r: any) => r.games?.season_year === seasonYear)
    : data;

  const history: PlayerHistoryItem[] = filtered.map((r: any) => ({
    game_id: r.games.id,
    game_name: r.games.name,
    game_type: r.games.type,
    date: r.games.date,
    season_year: r.games.season_year,
    position: r.position,
    profit_loss: Number(r.profit_loss ?? 0),
    ranking_points: Number(r.ranking_points ?? 0),
    ko_points: Number(r.ko_points ?? 0),
    is_winner: !!r.is_winner,
  }));

  history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    games: filtered.length,
    wins: filtered.filter((r: any) => r.is_winner).length,
    kos: filtered.reduce((s: number, r: any) => s + Number(r.ko_points ?? 0), 0),
    buyIns: filtered.reduce((s: number, r: any) => s + Number(r.entries ?? 0), 0),
    rebuys: filtered.reduce((s: number, r: any) => s + Number(r.rebuys ?? 0), 0),
    totalProfit: filtered.reduce((s: number, r: any) => s + Number(r.profit_loss ?? 0), 0),
    totalPoints: filtered.reduce((s: number, r: any) => s + Number(r.ranking_points ?? 0), 0),
    history,
  };
}

/**
 * XP & nível — fórmula provisória combinada com o usuário.
 * XP = total_points da temporada atual.
 * Nível = floor(XP/500)+1.
 */
export function computeXp(totalPointsCurrentSeason: number) {
  const xp = Math.max(0, Math.floor(totalPointsCurrentSeason));
  const level = Math.floor(xp / 500) + 1;
  const xpForNext = level * 500;
  const xpInLevel = xp - (level - 1) * 500;
  const progress = Math.min(100, (xpInLevel / 500) * 100);
  return { xp, level, xpForNext, xpInLevel, progress };
}

export function currentSeason(): number {
  return new Date().getFullYear();
}
