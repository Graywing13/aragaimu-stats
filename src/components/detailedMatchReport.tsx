import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import aragai from "../assets/aragai_screenshot.png";
import type { Game, Team } from "../common/interfaces/appInterfaces.ts";
import type { JosephJsonEntry, PlayerAnswer } from "../common/interfaces/josephJson.ts";
import _ from "lodash";
import { TeamsList } from "../assets/data/teamsList.ts";
import { getImageUrl } from "../common/util/imageUtil.ts";

function DetailedMatchReport() {
  const [fileMap, setFileMap] = useState<{ [fileName: string]: object | JosephJsonEntry[] }>({});
  const [bracketName, setBracketName] = useState("");
  const [playerNames, setPlayerNames] = useState<string[]>([]);

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

  const gameTeams: Team[] = useMemo(() => {
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

    return newTeams;
  }, [playerNames]);

  const games: Game[] = useMemo(() => {
    return [
      {
        teamA: {
          score: 10,
          rig: 10,
          rigMissed: 0,
          rigSniped: 4,
          ops: 5,
          eds: 2,
          ins: 3,
          avgDiff: 27.3,
        },
        teamB: {
          score: 13,
          rig: 15,
          rigMissed: 3,
          rigSniped: 1,
          ops: 6,
          eds: 6,
          ins: 1,
          avgDiff: 24.7,
        },
        metadata: { ops: 6, eds: 7, ins: 7, avgDiff: 24.4 },
      },
      {
        teamA: {
          score: 0,
          rig: 0,
          rigMissed: 0,
          rigSniped: 0,
          ops: 0,
          eds: 0,
          ins: 0,
          avgDiff: undefined,
        },
        teamB: {
          score: 10,
          rig: 10,
          rigMissed: 2,
          rigSniped: 2,
          ops: 0,
          eds: 8,
          ins: 2,
          avgDiff: 30.5,
        },
        metadata: { ops: 0, eds: 10, ins: 10, avgDiff: 19.5 },
      },
    ];
  }, []);

  const renderProperty = useCallback((key: string, value: string | number, idx?: number) => {
    const className = idx === 0 ? "bg-amber-100 border-b-2 border-amber-600" : "";
    return (
      <div className={`text-center ${className ?? ""}`} key={key}>
        {value}
      </div>
    );
  }, []);

  // TODO render rest
  const renderScoreboard = useCallback(
    (team: Team, isTeamA: boolean) => {
      const { teamName, seed } = team;
      const teamGameData = games[0][isTeamA ? "teamA" : "teamB"];
      const title = isTeamA ? `${teamName} | ${teamGameData.score}` : `${teamGameData.score} | ${teamName}`;
      const prefix = isTeamA ? "a-" : "b-";
      return [
        renderProperty(`${prefix}-title`, title, 0),
        renderProperty(`${prefix}-seed`, seed),
        renderProperty(`${prefix}-rigMissed`, teamGameData.rigMissed),
        renderProperty(`${prefix}-rigSniped`, teamGameData.rigSniped),
      ];
    },
    [games, renderProperty],
  );

  const labels = useMemo(() => {
    return ["-", "DE Seed", "Rigs Missed", "Rigs Sniped"].map((label, idx) =>
      renderProperty(`label-${label}`, label, idx),
    );
  }, [renderProperty]);

  const readFiles = useCallback(async (files: FileList) => {
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

    async function readFile(file: File): Promise<object> {
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
    }

    return { alerts, newFileMap };
  }, []);

  const onFilesUploaded = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) {
        alert("0 files received. Please try again.");
        return;
      }
      readFiles(e.target.files).then(({ alerts, newFileMap }) => {
        if (alerts.length) {
          alert(
            `Received the following errors:\n\n${alerts.map((a) => `- ${a}`).join("\n")}\n\nPlease fix the files and try again.`,
          );
        } else {
          setFileMap(newFileMap);
        }
      });
    },
    [readFiles],
  );

  const pfps = useMemo(() => {
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

    return (
      <div className={"flex w-full overflow-hidden justify-between items-center"}>
        {renderTeam(gameTeams[0], true)}
        <img src={getImageUrl("vs.jpg")} alt={"vs"} className={"w-14 h-14"} />
        {renderTeam(gameTeams[1], false)}
      </div>
    );
  }, [gameTeams]);

  const renderMatchDetails = useMemo(() => {
    if (gameTeams.length < 2) {
      return <div>Please select a (clean) Joseph JSON.</div>;
    }
    return (
      <div className={"w-[640px] border-4 border-slate-300 border-dashed py-4 px-12"}>
        <h2 className={"w-full text-center p-4 text-4xl"}>{bracketName}</h2>
        {pfps}
        <div className={"grid grid-rows-4 grid-flow-col"}>
          {[...renderScoreboard(gameTeams[0], true), ...labels, renderScoreboard(gameTeams[1], false)]}
        </div>
      </div>
    );
  }, [bracketName, gameTeams, labels, pfps, renderScoreboard]);

  return (
    <div className={"h-full w-full flex"}>
      <div className={"bg-amber-300 flex flex-col w-1/5 p-4"}>
        <img src={aragai} alt={"Aragaimu Profile Pic"} />
        <h3 className={"text-2xl pb-2"}>Config</h3>
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
      </div>
      <div className={"w-4/5 flex justify-center"}>{renderMatchDetails}</div>
    </div>
  );
}

export default DetailedMatchReport;
