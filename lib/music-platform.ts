export const MUSIC_PLATFORM_STORAGE_KEY = "album-daily:music-platform";
export const MUSIC_PLATFORM_EVENT = "album-daily:music-platform-change";

export type MusicPlatform = "spotify" | "apple-music" | "netease" | "qq-music";

export const DEFAULT_MUSIC_PLATFORM: MusicPlatform = "spotify";

export function isMusicPlatform(value: string | null | undefined): value is MusicPlatform {
  return (
    value === "spotify" ||
    value === "apple-music" ||
    value === "netease" ||
    value === "qq-music"
  );
}

export function readMusicPlatformPreference() {
  if (typeof window === "undefined") {
    return DEFAULT_MUSIC_PLATFORM;
  }

  const storedValue = window.localStorage.getItem(MUSIC_PLATFORM_STORAGE_KEY);
  return isMusicPlatform(storedValue) ? storedValue : DEFAULT_MUSIC_PLATFORM;
}

export function writeMusicPlatformPreference(platform: MusicPlatform) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MUSIC_PLATFORM_STORAGE_KEY, platform);
  window.dispatchEvent(new CustomEvent(MUSIC_PLATFORM_EVENT, { detail: platform }));
}
