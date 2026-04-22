// Sistema de pontuação dual por temporada
// - season_year < 2026: ranking puramente por LUCRO (R$)
// - season_year >= 2026: REGULAMENTO OFICIAL 2026
//   Torneio: Pontos = (PBT × FM) + KO
//   Cash:    Pontos = (PBC × FP) + (PP=5 + KO)

export type ScoringMode = "profit" | "points";

export function getScoringMode(seasonYear: number): ScoringMode {
  return seasonYear >= 2026 ? "points" : "profit";
}

// ─────────────────────────────────────────────────────────────────────
// TORNEIO
// ─────────────────────────────────────────────────────────────────────

// PBT[totalPlayers][position] — Tabela oficial 6→16 jogadores, posições 1→16.
// Valores ausentes (`--` no regulamento) = 0.
const PBT_TABLE: Record<number, Record<number, number>> = {
  6:  { 1: 60,  2: 45,  3: 30,  4: 20,  5: 10,  6: 5 },
  7:  { 1: 70,  2: 55,  3: 40,  4: 25,  5: 15,  6: 10, 7: 5 },
  8:  { 1: 80,  2: 60,  3: 45,  4: 30,  5: 20,  6: 13, 7: 5,  8: 3 },
  9:  { 1: 90,  2: 65,  3: 50,  4: 35,  5: 25,  6: 15, 7: 10, 8: 5,  9: 3 },
  10: { 1: 100, 2: 70,  3: 55,  4: 40,  5: 30,  6: 20, 7: 15, 8: 10, 9: 5,  10: 3 },
  11: { 1: 105, 2: 73,  3: 57,  4: 47,  5: 37,  6: 27, 7: 20, 8: 13, 9: 7,  10: 4,  11: 2 },
  12: { 1: 108, 2: 76,  3: 59,  4: 50,  5: 40,  6: 30, 7: 23, 8: 18, 9: 10, 10: 7,  11: 4,  12: 2 },
  13: { 1: 110, 2: 79,  3: 62,  4: 52,  5: 42,  6: 32, 7: 25, 8: 20, 9: 14, 10: 10, 11: 6,  12: 4,  13: 2 },
  14: { 1: 113, 2: 83,  3: 65,  4: 55,  5: 45,  6: 35, 7: 28, 8: 22, 9: 15, 10: 13, 11: 10, 12: 6,  13: 4,  14: 2 },
  15: { 1: 116, 2: 86,  3: 68,  4: 58,  5: 48,  6: 38, 7: 30, 8: 25, 9: 18, 10: 15, 11: 13, 12: 10, 13: 6,  14: 4,  15: 2 },
  16: { 1: 120, 2: 90,  3: 70,  4: 60,  5: 50,  6: 40, 7: 35, 8: 27, 9: 20, 10: 18, 11: 15, 12: 11, 13: 8,  14: 6,  15: 4,  16: 2 },
};

export function getPBT(totalPlayers: number, position: number): number {
  if (position <= 0) return 0;
  // Clamp: <6 jogadores usa tabela de 6; >16 usa tabela de 16
  const clampedTotal = Math.max(6, Math.min(16, totalPlayers));
  const row = PBT_TABLE[clampedTotal];
  return row?.[position] ?? 0;
}

// FM (Fator Multiplicador) por total de AÇÕES (entradas + reentradas).
export function getFM(totalActions: number): number {
  if (totalActions <= 15) return 1.0;
  if (totalActions <= 24) return 1.2;
  // 25–30 ações → 1.4 (acima de 30 mantemos 1.4 — regulamento não define outra faixa)
  return 1.4;
}

export interface TournamentPointsInput {
  totalPlayers: number;
  position: number;
  totalActions: number; // soma de entries+rebuys de TODOS os jogadores
  koPoints: number;
}

export function calcTournamentPoints({
  totalPlayers,
  position,
  totalActions,
  koPoints,
}: TournamentPointsInput): number {
  const pbt = getPBT(totalPlayers, position);
  const fm = getFM(totalActions);
  // Mantém precisão (FM pode produzir decimais como 1.2/1.4) — sem arredondamento.
  return pbt * fm + koPoints;
}

// ─────────────────────────────────────────────────────────────────────
// CASH GAME
// ─────────────────────────────────────────────────────────────────────

// PBC pela colocação no LUCRO (apenas resultados positivos pontuam na base)
const PBC_BY_PROFIT_POSITION: Record<number, number> = {
  1: 25, 2: 20, 3: 15, 4: 12, 5: 10,
};

export function getPBC(profitPosition: number | null, profitLoss: number): number {
  if (profitLoss === 0) return 5;
  if (profitLoss < 0) return 0;
  if (profitPosition && profitPosition >= 1 && profitPosition <= 5) {
    return PBC_BY_PROFIT_POSITION[profitPosition];
  }
  // 6º+ no lucro positivo mas fora do top5: 5 pts (consideramos como participação positiva)
  return 5;
}

// FP por LUCRO em buy-ins
export function getFP(profitInBuyIns: number): number {
  if (profitInBuyIns <= 1) return 1.0;
  if (profitInBuyIns <= 1.5) return 1.2;
  if (profitInBuyIns <= 3) return 1.3;
  if (profitInBuyIns <= 4) return 1.4;
  return 1.5;
}

export const PRESENCE_BONUS = 5;

export interface CashGamePointsInput {
  profitPosition: number | null; // colocação no lucro (1 = maior lucro positivo)
  profitLoss: number;
  buyInValue: number;
  koPoints: number;
}

export function calcCashGamePoints({
  profitPosition,
  profitLoss,
  buyInValue,
  koPoints,
}: CashGamePointsInput): number {
  const pbc = getPBC(profitPosition, profitLoss);
  // FP só faz sentido com lucro positivo; em prejuízo, FP = 1.0 (PBC já é 0)
  const profitInBI = buyInValue > 0 && profitLoss > 0 ? profitLoss / buyInValue : 0;
  const fp = profitLoss > 0 ? getFP(profitInBI) : 1.0;
  const total = pbc * fp + PRESENCE_BONUS + koPoints;
  // Mantém a precisão original (sem arredondar) — pontos podem ter casas decimais.
  return total;
}

// ─────────────────────────────────────────────────────────────────────
// API agregada
// ─────────────────────────────────────────────────────────────────────

export interface ParticipationPointsInput {
  seasonYear: number;
  gameType: "tournament" | "cash";
  totalPlayers: number;
  totalActions: number;
  position: number | null; // posição final (torneio) ou colocação no lucro (cash)
  profitLoss: number;
  buyInValue: number;
  koPoints: number;
}

export function calcParticipationPoints(args: ParticipationPointsInput): number {
  if (getScoringMode(args.seasonYear) === "profit") return 0;
  if (args.gameType === "tournament") {
    return calcTournamentPoints({
      totalPlayers: args.totalPlayers,
      position: args.position ?? args.totalPlayers,
      totalActions: args.totalActions,
      koPoints: args.koPoints,
    });
  }
  return calcCashGamePoints({
    profitPosition: args.position,
    profitLoss: args.profitLoss,
    buyInValue: args.buyInValue,
    koPoints: args.koPoints,
  });
}
