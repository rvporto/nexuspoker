// Sistema de pontuação dual por temporada
// - season_year < 2026: ranking puramente por LUCRO (R$)
// - season_year >= 2026: sistema de PONTOS (PBT/PBC × multiplicadores + KOs)

export type ScoringMode = "profit" | "points";

export function getScoringMode(seasonYear: number): ScoringMode {
  return seasonYear >= 2026 ? "points" : "profit";
}

// PBT: Pontos Base por Torneio, indexado pela quantidade de jogadores na partida.
// 6→16 jogadores explícitos; 17+ usa o último valor.
const PBT_BY_PLAYERS: Record<number, number> = {
  6: 60,
  7: 70,
  8: 80,
  9: 90,
  10: 100,
  11: 110,
  12: 120,
  13: 130,
  14: 140,
  15: 150,
  16: 160,
};

export function getPBT(totalPlayers: number): number {
  if (totalPlayers <= 6) return PBT_BY_PLAYERS[6];
  if (totalPlayers >= 16) return PBT_BY_PLAYERS[16];
  return PBT_BY_PLAYERS[totalPlayers] ?? PBT_BY_PLAYERS[16];
}

// PBC: Pontos Base por Cash Game (constante simples)
export const PBC = 50;

/**
 * Multiplicador por posição final no Torneio.
 * 1º = 1.5, 2º = 1.2, 3º = 1.0, demais = 0.8 → 0.3 conforme caem.
 */
export function getTournamentPositionMultiplier(position: number, totalPlayers: number): number {
  if (position <= 0) return 0.3;
  if (position === 1) return 1.5;
  if (position === 2) return 1.2;
  if (position === 3) return 1.0;
  // Top 50% recebe 0.8, restante 0.5, último 0.3
  if (position <= Math.ceil(totalPlayers / 2)) return 0.8;
  if (position < totalPlayers) return 0.5;
  return 0.3;
}

export interface TournamentPointsInput {
  totalPlayers: number;
  position: number;
  koPoints: number;
}

export function calcTournamentPoints({ totalPlayers, position, koPoints }: TournamentPointsInput): number {
  const pbt = getPBT(totalPlayers);
  const fm = getTournamentPositionMultiplier(position, totalPlayers);
  return Math.round(pbt * fm + koPoints);
}

export interface CashGamePointsInput {
  profitLoss: number; // R$ lucro ou prejuízo
  koPoints: number;
}

/**
 * Cash game: PBC × FP + 5 (presença) + KOs.
 * FP = fator de profit normalizado (0.5 prejuízo, 1.0 break-even, até 2.0 lucro alto).
 */
export function calcCashGamePoints({ profitLoss, koPoints }: CashGamePointsInput): number {
  let fp = 1.0;
  if (profitLoss < 0) fp = 0.5;
  else if (profitLoss === 0) fp = 1.0;
  else if (profitLoss < 50) fp = 1.2;
  else if (profitLoss < 150) fp = 1.5;
  else fp = 2.0;
  return Math.round(PBC * fp + 5 + koPoints);
}

/**
 * Calcula pontos para um participante baseado no tipo da partida.
 * Para temporadas legadas (< 2026), retorna 0 — o ranking usa profit_loss diretamente.
 */
export function calcParticipationPoints(args: {
  seasonYear: number;
  gameType: "tournament" | "cash";
  totalPlayers: number;
  position: number | null;
  profitLoss: number;
  koPoints: number;
}): number {
  if (getScoringMode(args.seasonYear) === "profit") return 0;
  if (args.gameType === "tournament") {
    return calcTournamentPoints({
      totalPlayers: args.totalPlayers,
      position: args.position ?? args.totalPlayers,
      koPoints: args.koPoints,
    });
  }
  return calcCashGamePoints({ profitLoss: args.profitLoss, koPoints: args.koPoints });
}
