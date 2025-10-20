const Seeds: { [teamName: string]: number } = {
  "HOW'S IT GOING?": 12,
  "S̷h̷a̷k̷e̷ ̷t̷h̷e̷ ̷D̷i̷C̷E̷": 14,
};

export function getTeamSeed(teamName: string): number {
  return Seeds[teamName] ?? 42;
}
