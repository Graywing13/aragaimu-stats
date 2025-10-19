import type { JosephJsonEntry, PlayerAnswer } from "../interfaces/josephJson.ts";
import type { Game, GameStats, Team, TeamGameStats } from "../interfaces/appInterfaces.ts";

export function extractJosephData(songs: JosephJsonEntry[], teams: Team[]) {
  if (songs.length === 0 || teams.length === 0) {
    return [];
  }
  const newMatchStats: Game[] = [];
  let currentGameStats: GameStats;
  let currentTeamsStats: TeamGameStats[];
  let prevSongNumber = -100; // set to any negative number to initialize stats

  songs.forEach((song) => {
    if (song.songNumber !== prevSongNumber + 1) {
      appendGame();
      currentGameStats = { ops: 0, eds: 0, ins: 0 };
      currentTeamsStats = createBlankTeamStats();
    }

    const songType = song.type.startsWith("Opening") ? "ops" : song.type.startsWith("Ending") ? "eds" : "ins";
    const teamScoreDelta = teams.map((team) => (findPlayerResults(song, team.playerNames[0]).correct ? 1 : 0));
    const teamRigDelta = teams.map((team) =>
      song.fromList.some((listInfo) => team.playerNames.includes(listInfo.name)) ? 1 : 0,
    );

    currentGameStats[songType] += 1;
    currentTeamsStats.forEach((team, teamIdx) => {
      team.score += teamScoreDelta[teamIdx];
      team.rig += teamRigDelta[teamIdx];
      team.sniped += !teamRigDelta[teamIdx] ? teamScoreDelta[teamIdx] : 0;
      team.rigMissed += teamRigDelta[teamIdx] && !teamScoreDelta[teamIdx] ? 1 : 0;
      team[`${songType}Hit`] += teamScoreDelta[teamIdx];
      team.totalDifficultySum += teamScoreDelta[teamIdx] ? +song.difficulty : 0;
    });

    prevSongNumber = song.songNumber; // advance
  });
  appendGame();
  return newMatchStats;

  function appendGame() {
    if (currentTeamsStats && currentGameStats) {
      currentTeamsStats[0].ptsGain = getPtsGain(currentTeamsStats[0].score, currentTeamsStats[1].score);
      currentTeamsStats[1].ptsGain = getPtsGain(currentTeamsStats[1].score, currentTeamsStats[0].score);
      newMatchStats.push({
        teamsStats: currentTeamsStats,
        metadata: currentGameStats,
      });
    }
  }

  function getPtsGain(thisTeamScore: number, otherTeamScore: number) {
    if (thisTeamScore > otherTeamScore) {
      return 1;
    }
    if (thisTeamScore === otherTeamScore) {
      return 0.5;
    }
    return 0;
  }

  function createBlankTeamStats(): TeamGameStats[] {
    return teams.map(() => {
      return {
        score: 0,
        rig: 0,
        sniped: 0,
        rigMissed: 0,
        opsHit: 0,
        edsHit: 0,
        insHit: 0,
        totalDifficultySum: 0,
        ptsGain: 0,
      };
    });
  }

  function findPlayerResults(song: JosephJsonEntry, playerName: string): PlayerAnswer {
    const result = song.players.find((ans) => ans.name === playerName);
    if (!result) {
      throw new Error(`Could not find player ${playerName} in song ${JSON.stringify(song)}`);
    }
    return result;
  }
}
