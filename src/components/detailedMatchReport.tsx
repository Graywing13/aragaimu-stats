import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import aragai from "../assets/aragai_screenshot.png";
import vs_png from "../assets/vs.png";
import type { Game, GameStats, Team, TeamGameStats } from "../common/interfaces/appInterfaces.ts";
import type { JosephJsonEntry, PlayerAnswer } from "../common/interfaces/josephJson.ts";
import _ from "lodash";
import { TeamsList } from "../assets/data/teamsList.ts";
import { getImageUrl } from "../common/util/imageUtil.ts";
import { extractJosephData } from "../common/util/josephJsonUtil.ts";

const SITE_VERSION = 0.1;

const TEAM_INFO_LABELS = ["-", "DE Seed"];

const TEAM_GAME_STAT_LABELS = [
  "Total Points",
  "Total Rig",
  "Rig Missed",
  "Rig Sniped",
  "OPs Hit",
  "EDs Hit",
  "INs Hit",
  "Avg correct difficulty",
];

function DetailedMatchReport() {
  const [fileMap, setFileMap] = useState<{ [fileName: string]: object | JosephJsonEntry[] }>({});
  const [bracketName, setBracketName] = useState("");
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [rowLabels, setRowLabels] = useState<string[]>([]);
  const [matchStats, setMatchStats] = useState<Game[]>([]);

  const isOfficialJson = useCallback((contents: object | object[]) => {
    return !Array.isArray(contents);
  }, []);

  useEffect(() => {
    const firstJson = Object.values(fileMap).at(0);
    if (!firstJson) {
      return;
    }
    if (isOfficialJson(firstJson)) {
      const error = "Only Joseph98's JSONs are accepted for now.";
      alert(error);
      setPlayerNames([]);
    } else {
      const typedJson = firstJson as JosephJsonEntry[];
      setPlayerNames(typedJson[0]["players"]?.map((answer: PlayerAnswer) => answer.name));
    }
  }, [fileMap, isOfficialJson]);

  // TODO remove and fill out the grid instead
  useEffect(() => {
    console.log(matchStats);
  }, [matchStats]);

  useEffect(() => {
    const cumulativeMatchStats: Game[] = [];
    Object.values(fileMap).forEach((json) => {
      if (isOfficialJson(json)) {
        const error = "Only Joseph98's JSONs are accepted for now.";
        alert(error);
      } else {
        const typedJson = json as JosephJsonEntry[];
        cumulativeMatchStats.push(...extractJosephData(typedJson, teams));
      }
    });
    setMatchStats(cumulativeMatchStats);
  }, [fileMap, isOfficialJson, teams]);

  useEffect(() => {
    const newTeams: Team[] = [];
    let unteamedPlayers = playerNames.slice();
    while (unteamedPlayers.length) {
      try {
        const newTeam = findPlayerTeam(unteamedPlayers[0]);
        newTeams.push(newTeam);
        unteamedPlayers = _.difference(unteamedPlayers, newTeam.playerNames);
      } catch (e: unknown) {
        alert(e);
        unteamedPlayers.shift();
      }
    }
    setTeams(newTeams);

    function findPlayerTeam(playerName: string): Team {
      const teamInfo = TeamsList.find((t) => t.players.indexOf(playerName) > -1);
      if (!teamInfo) {
        throw new Error(`Could not find player "${playerName}" in this website's team info list.`);
      }
      return {
        teamName: teamInfo.teamName,
        playerNames: teamInfo.players,
        seed: -1,
      };
    }
  }, [playerNames]);

  const getGameFromLabel = useCallback(
    (label: string): Game => {
      const gameNumber = Number(label.split(" ")[1]);
      if (!gameNumber) throw new Error(`Invalid game number: ${label}`);
      const gameIdx = gameNumber - 1;
      const game = matchStats.at(gameIdx);
      if (!game) throw new Error(`Invalid game idx: ${gameIdx}. MatchStats length: ${matchStats.length}`);
      return game;
    },
    [matchStats],
  );

  const jsxScoreboard = useMemo(() => {
    if (!teams.length || !rowLabels.length || !matchStats.length) {
      return null;
    }
    return rowLabels.map((label, idx) => {
      return (
        <div
          className={`grid grid-cols-3 px-2 ${idx === 0 ? "bg-pink-800 border-b-2 border-pink-900" : ""}`}
          key={`label-${label}`}
        >
          {renderCell(
            getCellData(label, 0),
            `${teams[0].teamName}-${label}`,
            undefined,
            getSecondaryCellData(label, 0),
          )}
          {renderCell(label, `label-${label}`, `font-semibold`)}
          {renderCell(
            getCellData(label, 1),
            `${teams[1].teamName}-${label}`,
            undefined,
            getSecondaryCellData(label, 1),
          )}
        </div>
      );
    });

    // TODO calculate remaining stats
    function getCellData(label: string, teamIdx: number) {
      if (label === "-") {
        return teamIdx === 0
          ? `${teams[teamIdx].teamName} | ${sumAcrossGames(teamIdx, "ptsGain")}`
          : `${sumAcrossGames(teamIdx, "ptsGain")} | ${teams[teamIdx].teamName}`;
      } else if (label === "DE Seed") {
        return teams[teamIdx].seed;
      } else if (label.startsWith("Game")) {
        return getGameFromLabel(label).teamsStats[teamIdx].score;
      } else if (label === "Total Points") {
        return sumAcrossGames(teamIdx, "score");
      } else if (label === "Total Rig") {
        return sumAcrossGames(teamIdx, "rig");
      } else if (label === "Rig Missed") {
        return sumAcrossGames(teamIdx, "rigMissed");
      } else if (label === "Rig Sniped") {
        return sumAcrossGames(teamIdx, "sniped");
      } else if (label === "OPs Hit") {
        return sumAcrossGames(teamIdx, "opsHit");
      } else if (label === "EDs Hit") {
        return sumAcrossGames(teamIdx, "edsHit");
      } else if (label === "INs Hit") {
        return sumAcrossGames(teamIdx, "insHit");
      } else if (label === "Avg correct difficulty") {
        return round(sumAcrossGames(teamIdx, "totalDifficultySum") / sumAcrossGames(teamIdx, "score"), 3);
      } else {
        return `** ${label} **`;
      }
    }

    function getSecondaryCellData(label: string, teamIdx: number) {
      if (label === "Total Points") {
        return ` (${round((100 * sumAcrossGames(teamIdx, "score")) / getTotalSongs(["ops", "eds", "ins"]), 1)}%)`;
      } else if (label === "Rig Sniped") {
        return ` / ${getTotalSongs(["ops", "eds", "ins"]) - sumAcrossGames(teamIdx, "rig")}`;
      } else if (label === "OPs Hit") {
        return ` / ${getTotalSongs(["ops"])}`;
      } else if (label === "EDs Hit") {
        return ` / ${getTotalSongs(["eds"])}`;
      } else if (label === "INs Hit") {
        return ` / ${getTotalSongs(["ins"])}`;
      }
      return undefined;
    }

    function renderCell(value: string | number, key: string, className?: string, secondaryValue?: string) {
      const extraText = getExtraText(value);
      return (
        <div className={`text-center ${className}`} key={key}>
          <div>
            {value}
            {secondaryValue && <span className={"text-slate-500 text-sm"}>{secondaryValue}</span>}
          </div>
          {extraText && <div className={"text-xs text-slate-500 font-normal"}>{extraText}</div>}
        </div>
      );
    }

    function getExtraText(value: string | number) {
      if (typeof value === "string" && value.startsWith("Game")) {
        const { ops, eds, ins } = getGameFromLabel(value).metadata;
        return `(ops: ${ops}, eds: ${eds}, ins: ${ins})`;
      }
    }

    function sumAcrossGames(teamIdx: number, property: keyof TeamGameStats): number {
      return sum(matchStats.map((game) => game.teamsStats[teamIdx][property]));
    }

    function getTotalSongs(songTypes: (keyof GameStats)[]) {
      return sum(matchStats.map((game) => sum(songTypes.map((type) => game.metadata[type]))));
    }

    function sum(nums: number[]) {
      return nums.reduce((acc, curr) => acc + curr, 0);
    }

    function round(unrounded: number, decimalPlaces: number): number {
      const magnitude = Math.pow(10, decimalPlaces);
      return Math.round(magnitude * unrounded) / magnitude;
    }
  }, [getGameFromLabel, matchStats, rowLabels, teams]);

  useEffect(() => {
    const gameLabels = matchStats.map((_game, idx) => `Game ${idx + 1}`);
    setRowLabels([...TEAM_INFO_LABELS, ...gameLabels, ...TEAM_GAME_STAT_LABELS]);
  }, [matchStats]);

  const readFile: (file: File) => Promise<object> = useCallback(async (file: File) => {
    const fileReader = new FileReader();
    return new Promise((resolve, reject) => {
      fileReader.onerror = (e) => {
        reject(`Bad file (${file.name}): received error when reading file: ${e.target?.error}`);
      };
      fileReader.onload = (e) => {
        if (typeof e.target?.result !== "string") {
          reject(`Bad file (${file.name}): expected to read string text but got ${typeof e.target?.result}`);
          return;
        }
        try {
          resolve(JSON.parse(e.target.result));
        } catch (error: unknown) {
          reject(`Bad file (${file.name}): received error when parsing JSON: ${JSON.stringify(error)}`);
        }
      };
      fileReader.readAsText(file);
    });
  }, []);

  const readFiles = useCallback(
    async (files: FileList) => {
      const alerts: string[] = [];
      const newFileMap: { [fileName: string]: object } = {};
      for (let idx = 0; idx < files.length; idx++) {
        const file = files[idx];
        if (file.type !== "application/json") {
          alerts.push(`Bad file (${file.name}): ensure this is a .json file that can be opened.`);
          continue;
        }
        try {
          newFileMap[file.name] = await readFile(file);
        } catch (e: unknown) {
          alerts.push(e as string);
        }
      }
      return { alerts, newFileMap };
    },
    [readFile],
  );

  const onFilesUploaded = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) {
        alert("0 files received. Please try again.");
        return;
      }
      readFiles(e.target.files).then(({ alerts, newFileMap }) => {
        if (alerts.length) {
          const alertsSummary = `Received the following errors:\n\n${alerts.map((a) => `- ${a}`).join("\n")}\n\nPlease fix the files and try again.`;
          alert(alertsSummary);
        } else {
          setFileMap(newFileMap);
        }
      });
    },
    [readFiles],
  );

  const jsxPfps = useMemo(() => {
    if (!teams.length) {
      return null;
    }
    return (
      <div className={"flex w-full overflow-hidden justify-between items-center"}>
        {renderTeam(teams[0], true)}
        <img src={vs_png} alt={"vs"} className={"w-14 h-14 invert-100"} />
        {renderTeam(teams[1], false)}
      </div>
    );

    function renderTeam(team: Team, isTeamA: boolean) {
      return (
        <div className={`flex ${isTeamA ? "justify-start" : "justify-end"}`}>
          {team.playerNames.map((name: string) => (
            <img
              src={getImageUrl(`pfps/${name}.webp`)}
              alt={name}
              key={`pfp-${name}`}
              className={`${isTeamA ? "-scale-x-100" : ""} w-24`}
            />
          ))}
        </div>
      );
    }
  }, [teams]);

  const jsxMatchDetails = useMemo(() => {
    if (teams.length < 2) {
      return <div>Please select a Joseph JSON.</div>;
    }
    return (
      <div className={"w-[640px] border-4 border-slate-300 border-dashed py-4 px-12"}>
        <h2 className={"w-full text-center p-4 text-4xl"}>{bracketName || "< input bracket >"}</h2>
        {jsxPfps}
        {jsxScoreboard}
      </div>
    );
  }, [teams, bracketName, jsxPfps, jsxScoreboard]);

  const jsxJsonSelector = useMemo(() => {
    return (
      <div className={"w-full overflow-hidden p-2 flex flex-col gap-2  text-slate-900"}>
        <label htmlFor={"json-input"}>Select JSON: </label>
        <input
          id={"json-input"}
          type={"file"}
          onChange={onFilesUploaded}
          className={
            "w-full text-sm cursor-pointer py-1 px-2 rounded-md bg-slate-200 hover:bg-slate-300 transition-colors"
          }
          multiple={true}
        />
        <textarea
          className={"bg-slate-100 text-slate-700 cursor-default border-2 rounded-sm border-slate-300"}
          value={JSON.stringify(fileMap)}
          readOnly={true}
        />
      </div>
    );
  }, [fileMap, onFilesUploaded]);

  const jsxBracketNameInput = useMemo(() => {
    return (
      <div className={"w-full overflow-hidden p-2 flex flex-col gap-2 mt-2  text-slate-900"}>
        <label htmlFor={"bracket-name-input"}>Bracket Name: </label>
        <input
          id={"bracket-name-input"}
          className={"bg-yellow-50 border-2 border-gray-200 rounded-sm w-full px-2"}
          placeholder={"Losers Bracket 1"}
          value={bracketName}
          onChange={(e) => setBracketName(e.target.value)}
        />
      </div>
    );
  }, [bracketName]);

  return (
    <div className={"h-full w-full flex"}>
      <div className={"w-1/5 bg-pink-100 flex flex-col p-4"}>
        <img src={aragai} alt={"Aragaimu Profile Pic"} />
        <h3 className={"text-2xl pb-2 text-slate-900"}>Config</h3>
        {jsxJsonSelector}
        {jsxBracketNameInput}
        <div className={"text-xs text-slate-900"}>version {SITE_VERSION}</div>
      </div>
      <div className={"w-4/5 flex justify-center"}>{jsxMatchDetails}</div>
    </div>
  );
}

export default DetailedMatchReport;
