import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import aragai from "../assets/aragai_screenshot.png";
import type { Game, Team } from "../common/interfaces/appInterfaces.ts";
import type { JosephJsonEntry, PlayerAnswer } from "../common/interfaces/josephJson.ts";
import _ from "lodash";
import { TeamsList } from "../assets/data/teamsList.ts";
import { getImageUrl } from "../common/util/imageUtil.ts";
import { extractJosephData } from "../common/util/josephJsonUtil.ts";

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

  const jsxScoreboard = useMemo(() => {
    if (!teams.length || !rowLabels.length || !matchStats.length) {
      return null;
    }
    return rowLabels.map((label, idx) => {
      const textColour = idx === 0 ? "text-slate-100" : "";
      return (
        <div className={`grid grid-cols-3 ${idx === 0 ? "bg-pink-800 border-b-2 border-pink-900" : ""}`}>
          {renderCell(getCellData(label, 0), `${teams[0].teamName}-${label}`, textColour)}
          {renderCell(label, `label-${label}`, textColour)}
          {renderCell(getCellData(label, 1), `${teams[1].teamName}-${label}`, textColour)}
        </div>
      );
    });

    // TODO calculate remaining stats
    function getCellData(label: string, teamIdx: number) {
      // DE Seed
      // Game 1 Game 2 Game 3 (and respective op/ed/in distribution)
      // Total Points
      // Total Rig
      // Rig Missed
      // Rig Sniped
      // OPs Hit
      // EDs Hit
      // INs Hit
      // Avg correct difficulty

      if (label === "-") {
        const score = matchStats.map((game) => game.teamsStats[teamIdx].ptsGain).reduce((acc, curr) => acc + curr, 0);
        return `${teams[teamIdx].teamName} | ${score}`;
      } else {
        return `** ${label} **`;
      }
    }

    function renderCell(value: string, key: string, className: string) {
      return (
        <div className={`text-center ${className}`} key={key}>
          {value}
        </div>
      );
    }
  }, [matchStats, rowLabels, teams]);

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
        <img src={getImageUrl("vs.jpg")} alt={"vs"} className={"w-14 h-14"} />
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
      <div className={"w-full overflow-hidden p-2 flex flex-col gap-2"}>
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
      <div className={"w-full overflow-hidden p-2 flex flex-col gap-2 mt-2"}>
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
        <h3 className={"text-2xl pb-2"}>Config</h3>
        {jsxJsonSelector}
        {jsxBracketNameInput}
      </div>
      <div className={"w-4/5 flex justify-center"}>{jsxMatchDetails}</div>
    </div>
  );
}

export default DetailedMatchReport;
