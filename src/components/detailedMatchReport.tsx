import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import aragai from "../assets/aragai_screenshot.png";
import vs_png from "../assets/vs.png";
import type { Game, GameStats, Team, TeamGameStats } from "../common/interfaces/appInterfaces.ts";
import type { JosephJsonEntry, PlayerAnswer } from "../common/interfaces/josephJson.ts";
import _ from "lodash";
import { TeamsList } from "../assets/data/teamsList.ts";
import { extractJosephData } from "../common/util/josephJsonUtil.ts";
import { getAvatar } from "../assets/data/avatars.ts";
import { getTeamSeed } from "../assets/data/seeds.ts";

const SITE_VERSION = "0.10";

const GAME_PREFIX = "Game";

const LABEL = {
  TOTAL_POINTS: "Total Points",
  TOTAL_RIG: "Total Rig",
  RIG_MISSED: "Rig Missed",
  OFFLIST_HIT: "Offlist Hit",
  OPS_HIT: "OPs Hit",
  EDS_HIT: "EDs Hit",
  INS_HIT: "INs Hit",
  AVG_CORRECT_DIFFICULTY: "Avg correct difficulty",
};

const TEAM_GAME_STAT_LABELS = [
  LABEL.TOTAL_POINTS,
  LABEL.TOTAL_RIG,
  LABEL.RIG_MISSED,
  LABEL.OFFLIST_HIT,
  LABEL.OPS_HIT,
  LABEL.EDS_HIT,
  LABEL.INS_HIT,
  LABEL.AVG_CORRECT_DIFFICULTY,
];

function DetailedMatchReport() {
  const [fileMap, setFileMap] = useState<{ [fileName: string]: object | JosephJsonEntry[] }>({});
  const [bracketName, setBracketName] = useState("");
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [rowLabels, setRowLabels] = useState<string[]>([]);
  const [matchStats, setMatchStats] = useState<Game[]>([]);
  const [points, setPoints] = useState<number[]>([]);

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

  useEffect(() => {
    console.log(matchStats);
  }, [matchStats]);

  useEffect(() => {
    if (Object.values(fileMap).length === 0 || teams.length === 0) {
      return;
    }
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
    setPointsResults();

    function setPointsResults() {
      const nonDifferentialedPts = [sumAcrossGames(0, "ptsGain"), sumAcrossGames(1, "ptsGain")];
      if (nonDifferentialedPts[0] === nonDifferentialedPts[1]) {
        const totalScores = [sumAcrossGames(0, "score"), sumAcrossGames(1, "score")];
        if (totalScores[0] === totalScores[1]) {
          const alertMsg = `Are you sure this match is over? \nPts differential is ${nonDifferentialedPts}. \nScore differential is ${totalScores}`;
          alert(alertMsg);
          setPoints(nonDifferentialedPts);
        } else {
          const teamADelta = totalScores[0] > totalScores[1] ? 0.1 : -0.1;
          setPoints([nonDifferentialedPts[0] + teamADelta, nonDifferentialedPts[1] - teamADelta]);
        }
      } else {
        setPoints(nonDifferentialedPts);
      }
    }

    // TODO make these two functions reusable (they are used later too)
    function sumAcrossGames(teamIdx: number, property: keyof TeamGameStats): number {
      // warning - this takes a local variable, whereas the other takes the file's variable
      return sum(cumulativeMatchStats.map((game) => game.teamsStats[teamIdx][property]));
    }

    function sum(nums: number[]) {
      return nums.reduce((acc, curr) => acc + curr, 0);
    }
  }, [fileMap, isOfficialJson, teams]);

  useEffect(() => {
    const newTeams: Team[] = [];
    let unteamedPlayers = playerNames.slice();
    while (unteamedPlayers.length) {
      try {
        const newTeam = findPlayerTeam(unteamedPlayers);
        newTeams.push(newTeam);
        unteamedPlayers = _.difference(unteamedPlayers, newTeam.playerNames);
      } catch (e: unknown) {
        alert(e);
        unteamedPlayers.shift();
      }
    }
    newTeams.sort((teamA, teamB) => teamA.seed - teamB.seed);
    setTeams(newTeams);

    function findPlayerTeam(playerNames: string[]): Team {
      const upperPlayerName = playerNames[0].toLocaleUpperCase();
      const teamInfo = TeamsList.find((t) => t.players.indexOf(upperPlayerName) > -1);
      if (!teamInfo) {
        throw new Error(`Could not find player "${playerNames[0]}" in this website's team info list.`);
      }
      const caseCorrectedPlayers = playerNames.filter((p) => teamInfo.players.includes(p.toLocaleUpperCase()));
      return {
        teamName: teamInfo.teamName,
        playerNames: caseCorrectedPlayers,
        seed: getTeamSeed(teamInfo.teamName),
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

  const isWinner = useCallback(
    (teamIdx: number) => {
      return Math.max(...points) === points[teamIdx];
    },
    [points],
  );

  const jsxMatchSummary = useMemo(() => {
    if (!teams.length || !points.length) {
      return null;
    }
    return (
      <div className={"grid grid-cols-2"}>
        {renderSide(0)}
        {renderSide(1)}
      </div>
    );

    function renderSide(teamIdx: number) {
      const jsxTeamInfo = (
        <div className={`text-xl ${textStyle(teamIdx)} flex-col`}>
          <span>{`${teams[teamIdx].teamName} (${teams[teamIdx].seed})`}</span>
          <span
            className={"text-slate-400 text-xs text-shadow-none"}
          >{`${teams[teamIdx].playerNames[0]} / ${teams[teamIdx].playerNames[1]}`}</span>
        </div>
      );
      const jsxScore = (
        <div className={`text-5xl ${textStyle(teamIdx)} px-4`}>
          <span>{points[teamIdx]}</span>
        </div>
      );
      const className = teamIdx === 0 ? "justify-end border-r-2" : "justify-start border-l-2";
      return (
        <div className={`flex align-center border-slate-100 p-2 items-center ${className}`}>
          {teamIdx === 0 ? jsxTeamInfo : jsxScore}
          {teamIdx === 0 ? jsxScore : jsxTeamInfo}
        </div>
      );
    }

    function textStyle(teamIdx: number) {
      return `text-white flex ${teamIdx === 0 ? "items-end text-end" : "items-start text-start"} ${isWinner(teamIdx) ? "text-shadow-[0_0_10px_rgba(198,0,92,1)]" : ""}`;
    }
  }, [isWinner, points, teams]);

  const jsxMatchStats = useMemo(() => {
    if (!teams.length || !rowLabels.length || !matchStats.length) {
      return null;
    }
    return rowLabels.map((label, idx) => {
      const newSections = [LABEL.TOTAL_POINTS, LABEL.OPS_HIT];
      const borderTopStyle = newSections.includes(label) ? "border-t-2 border-black" : "";
      const rowStyle = `${borderTopStyle} ${idx === 0 ? "border-t-2 border-slate-600" : ""}`;
      return (
        <div className={`grid grid-cols-4`} key={`label-${label}`}>
          {renderDataCell(0, label, rowStyle)}
          {renderCell(
            label,
            `label-${label}`,
            `px-2 pl-1 font-semibold col-span-2 ${rowStyle}`,
            getSecondaryLabel(label),
          )}
          {renderDataCell(1, label, rowStyle)}
        </div>
      );
    });

    function renderDataCell(teamIdx: number, label: string, className: string) {
      const key = `${teams[teamIdx].teamName}-${label}`;
      const value = getCellData(label, teamIdx);
      const secondaryValue = getSecondaryData(label, teamIdx);
      return renderCell(value, key, `${className}`, secondaryValue, `${getPrimaryDataStyling(label, teamIdx)}`);
    }

    function getCellData(label: string, teamIdx: number) {
      if (label.startsWith(GAME_PREFIX)) {
        return getGameFromLabel(label).teamsStats[teamIdx].score;
      } else if (label === LABEL.TOTAL_POINTS) {
        return sumAcrossGames(teamIdx, "score");
      } else if (label === LABEL.TOTAL_RIG) {
        return sumAcrossGames(teamIdx, "rig");
      } else if (label === LABEL.RIG_MISSED) {
        return sumAcrossGames(teamIdx, "rigMissed");
      } else if (label === LABEL.OFFLIST_HIT) {
        return sumAcrossGames(teamIdx, "sniped");
      } else if (label === LABEL.OPS_HIT) {
        return sumAcrossGames(teamIdx, "opsHit");
      } else if (label === LABEL.EDS_HIT) {
        return sumAcrossGames(teamIdx, "edsHit");
      } else if (label === LABEL.INS_HIT) {
        return sumAcrossGames(teamIdx, "insHit");
      } else if (label === LABEL.AVG_CORRECT_DIFFICULTY) {
        return round(sumAcrossGames(teamIdx, "totalDifficultySum") / sumAcrossGames(teamIdx, "score"), 3);
      } else {
        return `** ${label} **`;
      }
    }

    function getSecondaryData(label: string, teamIdx: number) {
      if (label.startsWith(GAME_PREFIX)) {
        return ` ${getGameFromLabel(label).teamsStats[teamIdx].rig}`;
      } else if (label === LABEL.TOTAL_POINTS) {
        return ` (${round((100 * sumAcrossGames(teamIdx, "score")) / getTotalSongs(["ops", "eds", "ins"]), 1)}%)`;
      } else if (label === LABEL.OFFLIST_HIT) {
        return ` / ${getTotalSongs(["ops", "eds", "ins"]) - sumAcrossGames(teamIdx, "rig")}`;
      } else if (label === LABEL.OPS_HIT) {
        return ` / ${getTotalSongs(["ops"])}`;
      } else if (label === LABEL.EDS_HIT) {
        return ` / ${getTotalSongs(["eds"])}`;
      } else if (label === LABEL.INS_HIT) {
        return ` / ${getTotalSongs(["ins"])}`;
      }
      return undefined;
    }

    function getSecondaryLabel(value: string | number) {
      if (typeof value === "string" && value.startsWith(GAME_PREFIX)) {
        const { ops, eds, ins } = getGameFromLabel(value).metadata;
        return ` (${ops}-${eds}-${ins})*`;
      }
    }

    function getPrimaryDataStyling(label: string, teamIdx?: number) {
      let underlineStyle = "";
      if (label.startsWith(GAME_PREFIX) && teamIdx !== undefined) {
        const otherTeamIdx = teamIdx === 0 ? 1 : 0;
        const game = getGameFromLabel(label);
        if (game.teamsStats[teamIdx].score >= game.teamsStats[otherTeamIdx].score) {
          underlineStyle = "underline";
        }
      }
      return ` ${underlineStyle}`;
    }

    function renderCell(
      value: string | number,
      key: string,
      className?: string,
      secondaryValue?: string,
      primaryDataStyling?: string,
    ) {
      return (
        <div className={`text-center px-2 ${className}`} key={key}>
          <div>
            <span className={`${primaryDataStyling}`}>{value}</span>
            {secondaryValue && <span className={"text-slate-500 text-sm"}>{secondaryValue}</span>}
          </div>
        </div>
      );
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
    const gameLabels = matchStats.map((_game, idx) => `${GAME_PREFIX} ${idx + 1}`);
    setRowLabels([...gameLabels, ...TEAM_GAME_STAT_LABELS]);
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
      <div className={"flex overflow-hidden justify-between items-end pt-4"}>
        {renderTeam(teams[0], 0)}
        <img src={vs_png} alt={"vs"} className={"w-14 h-14 invert-100"} />
        {renderTeam(teams[1], 1)}
      </div>
    );

    function renderTeam(team: Team, teamIdx: number) {
      const isTeamA = teamIdx === 0;
      return (
        <div className={`flex ${isTeamA ? "justify-start" : "justify-end"}`}>
          {team.playerNames.map((name: string) => {
            return (
              <div key={`pfp-${name}`} className={"relative"}>
                <img
                  src={getAvatar(name)}
                  alt={name}
                  className={`w-24 ${isTeamA ? "-scale-x-100" : ""} ${isWinner(teamIdx) ? "drop-shadow-[0_35px_10px_rgba(134,16,67,0.8)]" : ""}`}
                />
                {/*<div className={"z-10 text-lg absolute wrap-anywhere top-0 font-bold"}>{name.toLocaleUpperCase()}</div>*/}
              </div>
            );
          })}
        </div>
      );
    }
  }, [isWinner, teams]);

  const jsxMatchDetails = useMemo(() => {
    if (teams.length < 2) {
      return <div>Please select a Joseph JSON.</div>;
    }
    return (
      <div className={"w-[640px] border-4 border-slate-300 border-dashed py-4 px-12"}>
        <div className={"flex w-full justify-center align-center p-4"}>
          <img className={"h-10"} src={aragai} alt={"Aragaimu Profile Pic"} />
          <h2 className={"text-center px-4 text-4xl"}>{bracketName || "** input bracket **"}</h2>
          <img className={"h-10"} src={aragai} alt={"Aragaimu Profile Pic"} />
        </div>
        {jsxMatchSummary}
        {jsxPfps}
        {jsxMatchStats}
        <div className={"w-full text-right text-sm text-slate-400 pt-4"}>* OPs-EDs-INs</div>
        <div className={"w-full text-right text-sm text-slate-400"}>Powered by Aragaimu 2025</div>
      </div>
    );
  }, [teams.length, bracketName, jsxPfps, jsxMatchSummary, jsxMatchStats]);

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
        <ul className={"list-disc list-inside"}>
          <li>REFRESH before changing jsons</li>
          <li>Everyone is seed 42 other than jlin team / shuuka team</li>
        </ul>
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
