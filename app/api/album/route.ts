import { NextResponse } from "next/server";
import {
  getAlbumDetailHref,
  getAlbumForDate,
  getMusicPlatformLinks,
  normalizeMusicPlatform,
  getSpotifySearchUrl,
} from "@/lib/albums";
import { getAlbumCoverUrl } from "@/lib/covers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const timeZone = process.env.ALBUM_TIMEZONE || "Asia/Shanghai";
  const { album, dateKey, index } = getAlbumForDate(new Date(), timeZone);
  const coverUrl = await getAlbumCoverUrl(album);
  const platform = normalizeMusicPlatform(new URL(request.url).searchParams.get("platform"));
  const playLinks = getMusicPlatformLinks(album, platform);

  return NextResponse.json({
    date: dateKey,
    index,
    timeZone,
    album,
    coverUrl,
    detailUrl: getAlbumDetailHref(album.rank),
    spotifyUrl: getSpotifySearchUrl(album),
    platform,
    playUrl: playLinks.webUrl,
    playLinks,
  });
}
