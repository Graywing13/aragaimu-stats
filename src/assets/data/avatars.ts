const DEFAULT_AVATAR_URL = "https://cdn.animemusicquiz.com/v1/avatars/Arai/Standard/Hairclip/black/250px/Head.webp";

const CUSTOM_AVATAR_URLS: { [playerName: string]: string } = {
  POOLNOODLE: "https://cdn.animemusicquiz.com/v1/avatars/Hikari/Fireman/Hat/aqua/250px/Head.webp",
};

export function getAvatar(playerName: string): string {
  return CUSTOM_AVATAR_URLS[playerName.toLocaleUpperCase()] || DEFAULT_AVATAR_URL;
}
