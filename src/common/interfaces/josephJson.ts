export interface JosephJsonEntry {
  name: string; // song name
  artist: string;
  anime: {
    english: string;
    romaji: string;
  };
  songNumber: number;
  players: PlayerAnswer[];
}

export interface PlayerAnswer {
  name: string; // player name
  score: number;
}
