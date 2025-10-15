interface GameData {
  ops: number;
  eds: number;
  ins: number;
  avgDiff?: number;
}

interface TeamGameData extends GameData {
  score: number;
  rig: number;
  rigMissed: number;
  rigSniped: number;
}

export interface Team {
  teamName: string;
  seed: number; // DE seed
  playerNames: string[];
}

export interface Game {
  teamA: TeamGameData;
  teamB: TeamGameData;
  metadata: GameData;
}
