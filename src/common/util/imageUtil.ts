const ASSETS_PATH = "/aragaimu-stats/src/assets";

export function getImageUrl(assetPath: string): string {
  const url = new URL(`${ASSETS_PATH}/${assetPath}`, import.meta.url);
  return url.href;
}
