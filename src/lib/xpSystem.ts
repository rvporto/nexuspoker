// Sistema central de XP e Conquistas
// Compartilhado entre frontend e edge function (lógica pura, sem dependências externas).

export const XP_PER_LEVEL = 1000;

export const calcLevel = (xp: number): number =>
  Math.max(1, Math.floor((xp || 0) / XP_PER_LEVEL) + 1);

export const xpProgressPercent = (xp: number): number =>
  Math.min(100, (((xp || 0) % XP_PER_LEVEL) / XP_PER_LEVEL) * 100);

export const XP_REWARDS = {
  participation: 100, // por partida jogada
  cash_profit: 200, // lucro em cash game
  tournament_top3: 300, // top 3 em torneio
  ko: 10, // por cada KO eliminado
};

export type AchievementType = "unique" | "rr" | "seasonal";

export interface AchievementDef {
  name: string;
  description: string;
  type: AchievementType;
  xp: number;
  threshold?: number; // obrigatório para unique e rr
}

/**
 * Definições de conquistas
 *  unique   → desbloqueada uma vez ao atingir threshold
 *  rr       → repetível a cada múltiplo de threshold
 *  seasonal → dada ao campeão do ano (maior lucro total)
 */
export const ACHIEVEMENT_DEFINITIONS: Record<string, AchievementDef> = {
  aprendiz: {
    name: "Aprendiz",
    description: "Participe de 10 partidas",
    type: "unique",
    xp: 500,
    threshold: 10,
  },
  engajado: {
    name: "Engajado",
    description: "Participe de 25 partidas",
    type: "unique",
    xp: 1000,
    threshold: 25,
  },
  veterano: {
    name: "Veterano",
    description: "Jogue 50 partidas",
    type: "unique",
    xp: 500,
    threshold: 50,
  },
  vencedor_rr: {
    name: "Vencedor",
    description: "Ganhe 5 torneios (repetível a cada +5)",
    type: "rr",
    xp: 1000,
    threshold: 5,
  },
  cashman_rr: {
    name: "Cash Man",
    description: "Tenha lucro em 5 cash games (repetível a cada +5)",
    type: "rr",
    xp: 500,
    threshold: 5,
  },
  consistente_rr: {
    name: "Consistente",
    description: "3 partidas seguidas com lucro (qualquer tipo)",
    type: "rr",
    xp: 300,
    threshold: 3,
  },
  btb_champion_rr: {
    name: "Back-to-Back",
    description: "Vença dois torneios consecutivos",
    type: "rr",
    xp: 500,
    threshold: 2,
  },
  sprinter_rr: {
    name: "Sprinter",
    description: "Vença um Sprint da temporada (bloco de 5 partidas)",
    type: "rr",
    xp: 400,
    threshold: 1,
  },
  soberano_rr: {
    name: "Soberano",
    description: "Seja o campeão da temporada (maior lucratividade no ano)",
    type: "seasonal",
    xp: 5000,
  },
};

export interface ParticipationLite {
  game_id: string;
  profit_loss: number;
  ko_points: number;
  is_winner: boolean;
  position: number | null;
}

export interface GameLite {
  id: string;
  type: "tournament" | "cash";
  date: string;
  season_year: number;
}

/** XP base de uma participação (sem conquistas) */
export const calcParticipationXP = (
  participation: ParticipationLite,
  game: GameLite | undefined,
): number => {
  if (!game) return 0;
  let xp = XP_REWARDS.participation;
  if (game.type === "cash" && (participation.profit_loss || 0) > 0)
    xp += XP_REWARDS.cash_profit;
  if (
    game.type === "tournament" &&
    participation.position !== null &&
    participation.position >= 1 &&
    participation.position <= 3
  )
    xp += XP_REWARDS.tournament_top3;
  xp += (participation.ko_points || 0) * XP_REWARDS.ko;
  return xp;
};

export interface AchievementsResult {
  totalXP: number;
  level: number;
  achievements_unlocked: string[];
  achievements_rr_count: Record<string, number>;
  achievements_rr_progress: Record<string, number>;
  achievements_seasonal: Record<string, number[]>;
}

/**
 * Processa histórico completo de um jogador e retorna XP + conquistas.
 * @param participations participações finalizadas, ordenadas por data ASC
 * @param gameMap        mapa { gameId -> game }
 * @param seasonChampionYears anos em que o jogador foi campeão (maior lucro do ano)
 * @param sprintsWon     número de sprints vencidos pelo jogador
 */
export const calcAllAchievements = (
  participations: ParticipationLite[],
  gameMap: Record<string, GameLite>,
  seasonChampionYears: number[] = [],
  sprintsWon = 0,
): AchievementsResult => {
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
    const profit = p.profit_loss || 0;
    const isProfit = profit > 0;

    // Consistente — streak de lucro
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

    // Cash Man — lucro em cash games (a cada 5)
    if (game.type === "cash" && isProfit) {
      cashProfitGames += 1;
      const times = Math.floor(
        cashProfitGames / (ACHIEVEMENT_DEFINITIONS.cashman_rr.threshold || 5),
      );
      const prev = rrCount.cashman_rr || 0;
      if (times > prev) {
        achievementXP += (times - prev) * ACHIEVEMENT_DEFINITIONS.cashman_rr.xp;
        rrCount.cashman_rr = times;
      }
    }

    // Vencedor + Back-to-Back
    if (game.type === "tournament" && p.is_winner) {
      tournamentWins += 1;
      const times = Math.floor(
        tournamentWins / (ACHIEVEMENT_DEFINITIONS.vencedor_rr.threshold || 5),
      );
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

  // Conquistas únicas por número de partidas
  if (totalGames >= (ACHIEVEMENT_DEFINITIONS.aprendiz.threshold ?? 10)) {
    unlocked.add("aprendiz");
    achievementXP += ACHIEVEMENT_DEFINITIONS.aprendiz.xp;
  }
  if (totalGames >= (ACHIEVEMENT_DEFINITIONS.engajado.threshold ?? 25)) {
    unlocked.add("engajado");
    achievementXP += ACHIEVEMENT_DEFINITIONS.engajado.xp;
  }
  if (totalGames >= (ACHIEVEMENT_DEFINITIONS.veterano.threshold ?? 50)) {
    unlocked.add("veterano");
    achievementXP += ACHIEVEMENT_DEFINITIONS.veterano.xp;
  }

  // Sprinter — contagem de sprints vencidos (passado de fora, calculado por bloco)
  if (sprintsWon > 0) {
    rrCount.sprinter_rr = sprintsWon;
    achievementXP += sprintsWon * ACHIEVEMENT_DEFINITIONS.sprinter_rr.xp;
  }

  // Progresso atual para exibição
  const vencedorThr = ACHIEVEMENT_DEFINITIONS.vencedor_rr.threshold || 5;
  const cashThr = ACHIEVEMENT_DEFINITIONS.cashman_rr.threshold || 5;
  rrProgress.vencedor_rr = tournamentWins % vencedorThr;
  rrProgress.cashman_rr = cashProfitGames % cashThr;
  rrProgress.consistente_rr = consecutiveProfit;
  rrProgress.btb_champion_rr = consecutiveTournamentWins;

  // Soberano — campeão sazonal
  const seasonalMap: Record<string, number[]> = {};
  if (seasonChampionYears.length > 0) {
    seasonalMap.soberano_rr = [...seasonChampionYears].sort();
    achievementXP +=
      seasonChampionYears.length * ACHIEVEMENT_DEFINITIONS.soberano_rr.xp;
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
};

export const LEVEL_TITLES: { min: number; label: string }[] = [
  { min: 1, label: "Novato" },
  { min: 5, label: "Aprendiz" },
  { min: 10, label: "Jogador" },
  { min: 20, label: "Experiente" },
  { min: 30, label: "Veterano" },
  { min: 50, label: "Mestre" },
  { min: 75, label: "Lenda" },
];

export const getLevelTitle = (level: number): string => {
  let title = LEVEL_TITLES[0].label;
  for (const t of LEVEL_TITLES) if (level >= t.min) title = t.label;
  return title;
};
