export interface GameStats {
  ops: number;
  eds: number;
  ins: number;
}

export interface TeamGameStats {
  score: number;
  rig: number;
  sniped: number;
  rigMissed: number;
  opsHit: number;
  edsHit: number;
  insHit: number;
  totalDifficultySum: number;
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
