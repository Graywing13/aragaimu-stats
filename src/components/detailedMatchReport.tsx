import { type ChangeEvent, useCallback, useMemo, useState } from "react";
import aragai from "./../../public/aragai_screenshot.png";
import type { Game, Team } from "../common/interfaces.ts";

function DetailedMatchReport() {
  const [fileMap, setFileMap] = useState<{ [fileName: string]: object }>({});
  const [bracketName, setBracketName] = useState("");

  const teamA: Team = useMemo(() => {
    return {
      teamName: "Team A",
      seed: 32, // DE bracket seed
      isTeamA: true,
      playerNames: ["Player 1", "Player 2"],
    };
  }, []);

  const teamB: Team = useMemo(() => {
    return {
      teamName: "Team B",
      seed: 17, // DE bracket seed
      isTeamA: false,
      playerNames: ["Player 3", "Player 4"],
    };
  }, []);

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

  const readFiles = useCallback((files: FileList) => {
    const alerts: string[] = [];
    const newFileMap: { [fileName: string]: object } = {};
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      if (file.type !== "application/json") {
        alerts.push(`Bad file (${file.name}): ensure this is a .json file that can be opened.`);
        continue;
      }
      setupFileReader(file).readAsText(file, "UTF-8");
    }

    function setupFileReader(file: File) {
      const fileReader = new FileReader();
      fileReader.onerror = (e) => {
        alerts.push(`Bad file (${file.name}): received error when reading file: ${e.target?.error}`);
      };
      fileReader.onload = (e) => {
        if (typeof e.target?.result !== "string") {
          alerts.push(`Bad file (${file.name}): expected to read string text but got ${typeof e.target?.result}`);
          return;
        }
        try {
          newFileMap[file.name] = JSON.parse(e.target.result);
        } catch (error: unknown) {
          alerts.push(`Bad file (${file.name}): received error when parsing JSON: ${JSON.stringify(error)}`);
        }
      };
      return fileReader;
    }

    return { alerts, newFileMap };
  }, []);

  const onFilesUploaded = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) {
        alert("0 files received. Please try again.");
        return;
      }
      const { alerts, newFileMap } = readFiles(e.target.files);

      if (alerts.length) {
        alert(`Received the following errors:\n\n${alerts.join("\n")}\n\nPlease fix the files and try again.`);
        return;
      }
      setFileMap(newFileMap);
    },
    [readFiles],
  );

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
      <div className={"w-4/5 flex justify-center"}>
        <div className={"w-[640px] border-4 border-slate-300 border-dashed py-4 px-12"}>
          <h2 className={"w-full text-center p-4 text-4xl"}>{bracketName}</h2>
          <div className={"grid grid-rows-4 grid-flow-col"}>
            {[...renderScoreboard(teamA, true), ...labels, renderScoreboard(teamB, false)]}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DetailedMatchReport;
