export interface GameStats {
  ops: number;
  eds: number;
  ins: number;
}

export interface TeamGameStats {
  score: number; // in-game score
  rig: number;
  sniped: number;
  rigMissed: number;
  opsHit: number;
  edsHit: number;
  insHit: number;
  totalDifficultySum: number;
  ptsGain: number; // 1 for win, 0.5 for tie, 0 for loss
}

export interface Team {
  teamName: string;
  seed: number; // DE seed
  playerNames: string[];
}

export interface Game {
  teamsStats: TeamGameStats[];
  metadata: GameStats;
}
