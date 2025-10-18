export interface JosephJsonEntry {
  name: string; // song name
  artist: string;
  anime: {
    english: string;
    romaji: string;
  };
  songNumber: number;
  difficulty: number;
  type: string; // JosephSongType + some number or "song"
  players: PlayerAnswer[];
  fromList: ListInfo[];
}

export interface PlayerAnswer {
  name: string; // player name
  correct: boolean;
}

interface ListInfo {
  name: string; // player name
}
