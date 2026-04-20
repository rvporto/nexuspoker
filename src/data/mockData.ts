/**
 * Centralized mock data for Phase 1 (pre-backend) previews.
 * Replaced by Lovable Cloud queries in Phase 2.
 */

export type SeasonYear = 2025 | 2026;

export type MockPlayer = {
  id: string;
  nickname: string;
  fullName: string;
  isTemporary?: boolean;
  avatarUrl?: string;
};

export type MockGame = {
  id: string;
  name: string;
  type: "tournament" | "cash";
  date: string; // ISO
  seasonYear: SeasonYear;
  buyIn: number;
  rebuyValue: number;
  status: "scheduled" | "finished";
  totalPot: number;
  players: number;
  houseFee?: number;
};

export type MockRankingRow = {
  position: number;
  prevPosition?: number;
  player: MockPlayer;
  points: number; // used for 2026+
  profit: number; // used for 2025
  games: number;
  wins: number;
  kos: number;
  buyIns: number;
  rebuys: number;
};

export const mockPlayers: MockPlayer[] = [
  { id: "p1", nickname: "Carlos Silva", fullName: "Carlos Silva" },
  { id: "p2", nickname: "Rafael Costa", fullName: "Rafael Costa" },
  { id: "p3", nickname: "Bruno Mendes", fullName: "Bruno Mendes" },
  { id: "p4", nickname: "Lucas Rocha", fullName: "Lucas Rocha" },
  { id: "p5", nickname: "Diego Alves", fullName: "Diego Alves" },
  { id: "p6", nickname: "Thiago Lima", fullName: "Thiago Lima" },
  { id: "p7", nickname: "Mateus Pires", fullName: "Mateus Pires" },
  { id: "t1", nickname: "ZéDoPoker", fullName: "José Dias", isTemporary: true },
  { id: "t2", nickname: "Magrão", fullName: "", isTemporary: true },
];

export const mockGames: MockGame[] = [
  {
    id: "g1",
    name: "Etapa 03 - Abril",
    type: "tournament",
    date: "2026-04-12T20:00:00",
    seasonYear: 2026,
    buyIn: 50,
    rebuyValue: 50,
    status: "finished",
    totalPot: 1350,
    players: 9,
    houseFee: 90,
  },
  {
    id: "g2",
    name: "Cash Game Sexta",
    type: "cash",
    date: "2026-04-05T21:00:00",
    seasonYear: 2026,
    buyIn: 100,
    rebuyValue: 50,
    status: "finished",
    totalPot: 980,
    players: 7,
    houseFee: 50,
  },
  {
    id: "g3",
    name: "Etapa 02 - Março",
    type: "tournament",
    date: "2026-03-15T20:00:00",
    seasonYear: 2026,
    buyIn: 50,
    rebuyValue: 50,
    status: "finished",
    totalPot: 1100,
    players: 8,
    houseFee: 80,
  },
  {
    id: "g4",
    name: "Final de Temporada 2025",
    type: "tournament",
    date: "2025-12-20T20:00:00",
    seasonYear: 2025,
    buyIn: 100,
    rebuyValue: 100,
    status: "finished",
    totalPot: 2400,
    players: 12,
    houseFee: 120,
  },
];

export const mockRanking2026: MockRankingRow[] = [
  { position: 1, prevPosition: 2, player: mockPlayers[0], points: 285, profit: 640, games: 8, wins: 3, kos: 12, buyIns: 8, rebuys: 14 },
  { position: 2, prevPosition: 1, player: mockPlayers[1], points: 262, profit: 420, games: 8, wins: 2, kos: 9, buyIns: 8, rebuys: 11 },
  { position: 3, prevPosition: 3, player: mockPlayers[2], points: 241, profit: 310, games: 7, wins: 2, kos: 7, buyIns: 7, rebuys: 9 },
  { position: 4, prevPosition: 5, player: mockPlayers[7], points: 198, profit: 180, games: 6, wins: 1, kos: 5, buyIns: 6, rebuys: 7 },
  { position: 5, prevPosition: 4, player: mockPlayers[3], points: 190, profit: 120, games: 7, wins: 1, kos: 6, buyIns: 7, rebuys: 8 },
  { position: 6, prevPosition: 6, player: mockPlayers[4], points: 152, profit: -40, games: 6, wins: 0, kos: 4, buyIns: 6, rebuys: 10 },
  { position: 7, prevPosition: 8, player: mockPlayers[5], points: 140, profit: -80, games: 5, wins: 0, kos: 3, buyIns: 5, rebuys: 8 },
  { position: 8, prevPosition: 7, player: mockPlayers[8], points: 110, profit: -150, games: 5, wins: 0, kos: 2, buyIns: 5, rebuys: 9 },
  { position: 9, player: mockPlayers[6], points: 78, profit: -220, games: 4, wins: 0, kos: 1, buyIns: 4, rebuys: 7 },
];

export const mockRanking2025: MockRankingRow[] = [
  { position: 1, player: mockPlayers[1], points: 0, profit: 2400, games: 22, wins: 5, kos: 28, buyIns: 22, rebuys: 35 },
  { position: 2, player: mockPlayers[0], points: 0, profit: 1850, games: 22, wins: 4, kos: 22, buyIns: 22, rebuys: 30 },
  { position: 3, player: mockPlayers[2], points: 0, profit: 980, games: 20, wins: 3, kos: 18, buyIns: 20, rebuys: 26 },
  { position: 4, player: mockPlayers[4], points: 0, profit: 540, games: 18, wins: 2, kos: 14, buyIns: 18, rebuys: 22 },
  { position: 5, player: mockPlayers[3], points: 0, profit: -120, games: 16, wins: 1, kos: 9, buyIns: 16, rebuys: 18 },
];
