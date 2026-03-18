import albums from "@/data/albums.json";
import {
  DEFAULT_MUSIC_PLATFORM,
  isMusicPlatform,
  type MusicPlatform,
} from "@/lib/music-platform";

type AlbumRecord = {
  rank: number;
  artist: string;
  album: string;
  year: number;
  genre: string;
  label?: string;
  cover: string;
  desc: string;
  desc_raw?: string;
  desc_html?: string;
  spotify_url?: string;
  source_url?: string;
};

export type Album = AlbumRecord & {
  desc_raw: string;
  source_url: string;
};

type AlbumQuery = Pick<Album, "artist" | "album">;

export type MusicPlatformLinks = {
  platform: MusicPlatform;
  label: string;
  webUrl: string;
  appUrl: string;
};

function getDateKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function hashDateKey(dateKey: string) {
  return dateKey.split("-").reduce((sum, part) => sum + Number(part), 0);
}

function normalizeAlbum(record: AlbumRecord): Album {
  const desc = record.desc || "";
  const descRaw = record.desc_raw || desc;

  return {
    ...record,
    desc_raw: descRaw,
    desc,
    source_url: record.source_url || "",
  };
}

export function getAlbumList(): Album[] {
  return (albums as AlbumRecord[]).map(normalizeAlbum);
}

export function getAlbumByRank(rank: number) {
  return getAlbumList().find((album) => album.rank === rank) ?? null;
}

export function getAlbumSummaries() {
  return getAlbumList().map((album) => ({
    rank: album.rank,
    artist: album.artist,
    album: album.album,
    year: album.year,
    label: album.label || "",
  }));
}

export function getAlbumDetailHref(rank: number) {
  return `/albums/${rank}`;
}

export function getSpotifySearchUrl(album: AlbumQuery) {
  const query = encodeURIComponent(`${album.album} ${album.artist}`);
  return `https://open.spotify.com/search/${query}`;
}

export function normalizeMusicPlatform(platform?: string | null) {
  return isMusicPlatform(platform) ? platform : DEFAULT_MUSIC_PLATFORM;
}

export function getMusicPlatformLinks(
  album: AlbumQuery,
  platform: MusicPlatform = DEFAULT_MUSIC_PLATFORM,
): MusicPlatformLinks {
  const query = `${album.album} ${album.artist}`;
  const encodedQuery = encodeURIComponent(query);

  switch (platform) {
    case "apple-music":
      return {
        platform,
        label: "Open in Apple Music",
        webUrl: `https://music.apple.com/us/search?term=${encodedQuery}`,
        appUrl: `music://music.apple.com/us/search?term=${encodedQuery}`,
      };
    case "netease":
      return {
        platform,
        label: "打开网易云音乐",
        webUrl: `https://music.163.com/#/search/m/?s=${encodedQuery}&type=1`,
        appUrl: `orpheus://search?keyword=${encodedQuery}`,
      };
    case "qq-music":
      return {
        platform,
        label: "打开 QQ 音乐",
        webUrl: `https://y.qq.com/n/ryqq/search?w=${encodedQuery}`,
        appUrl: `qqmusic://qq.com/ui/openUrl?url=${encodeURIComponent(`https://y.qq.com/n/ryqq/search?w=${encodedQuery}`)}`,
      };
    case "spotify":
    default:
      return {
        platform: "spotify",
        label: "Open in Spotify",
        webUrl: getSpotifySearchUrl(album),
        appUrl: `spotify:search:${query}`,
      };
  }
}

export function getAlbumForDate(date = new Date(), timeZone = "UTC") {
  const list = getAlbumList();

  if (list.length === 0) {
    throw new Error("Album list is empty.");
  }

  const dateKey = getDateKey(date, timeZone);
  const index = hashDateKey(dateKey) % list.length;

  return {
    album: list[index],
    dateKey,
    index,
  };
}
