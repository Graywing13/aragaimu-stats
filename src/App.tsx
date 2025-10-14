import { type ChangeEvent, useCallback, useMemo, useState } from "react";
import "./App.css";
import aragai from "./../public/aragai_screenshot.png";

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

interface Team {
  teamName: string;
  score: number;
  seed: number;
  isTeamA: boolean;
}

interface Game {
  teamA: TeamGameData;
  teamB: TeamGameData;
  metadata: GameData;
}

function App() {
  const [fileContents, setFileContents] = useState<string[]>([]);
  const [bracketName, setBracketName] = useState("");

  const teamA: Team = useMemo(() => {
    return {
      teamName: "Team A",
      score: 0,
      seed: 32, // DE bracket seed
      isTeamA: true,
    };
  }, []);

  const teamB: Team = useMemo(() => {
    return {
      teamName: "Team B",
      score: 2,
      seed: 17, // DE bracket seed
      isTeamA: false,
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
    (team: Team) => {
      const { score, isTeamA, teamName, seed } = team;
      const title = isTeamA ? `${teamName} | ${score}` : `${score} | ${teamName}`;
      const prefix = isTeamA ? "a-" : "b-";
      const teamGameData = games[0][isTeamA ? "teamA" : "teamB"];
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
    return ["-", "Seed", "Rigs Missed", "Rigs Sniped"].map((label, idx) =>
      renderProperty(`label-${label}`, label, idx),
    );
  }, [renderProperty]);

  const handleFileUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    // TODO edit for multi-upload
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/json") {
      alert("bad file, ensure the file is json and can be opened");
      return;
    }
    const fileReader = new FileReader();
    fileReader.readAsText(file, "UTF-8");
    fileReader.onload = (e) => {
      console.log("e.target.result", e?.target?.result);
      setFileContents([e?.target?.result as string]);
    };
  }, []);

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
            onChange={handleFileUpload}
            className={
              "w-full text-sm cursor-pointer py-1 px-2 rounded-md bg-slate-200 hover:bg-slate-300 transition-colors"
            }
          />
          <textarea
            className={"bg-slate-100 text-slate-700 cursor-default border-2 rounded-sm border-slate-300"}
            value={fileContents[0]}
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
            {[...renderScoreboard(teamA), ...labels, renderScoreboard(teamB)]}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
