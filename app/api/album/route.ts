import { NextRequest, NextResponse } from "next/server";
import {
  getAlbumDetailHref,
  getAlbumForDate,
  getMusicPlatformLinks,
  normalizeMusicPlatform,
  getSpotifySearchUrl,
} from "@/lib/albums";
import { getAlbumCoverUrl } from "@/lib/covers";
import {
  CUSTOM_RECOMMENDATION_COOKIE,
  parseRecommendationCookieValue,
} from "@/lib/custom-library";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const timeZone = process.env.ALBUM_TIMEZONE || "Asia/Shanghai";
  const platform = normalizeMusicPlatform(new URL(request.url).searchParams.get("platform"));
  const snapshot = parseRecommendationCookieValue(
    request.cookies.get(CUSTOM_RECOMMENDATION_COOKIE)?.value,
  );
  const { album, dateKey, index } = getAlbumForDate(new Date(), timeZone);

  if (snapshot?.dateKey === dateKey) {
    const playLinks = getMusicPlatformLinks(snapshot.album, platform);

    return NextResponse.json({
      source: "custom",
      date: dateKey,
      index: null,
      timeZone,
      album: snapshot.album,
      coverUrl: null,
      detailUrl: null,
      spotifyUrl: getSpotifySearchUrl(snapshot.album),
      platform,
      playUrl: playLinks.webUrl,
      playLinks,
    });
  }

  const coverUrl = await getAlbumCoverUrl(album);
  const playLinks = getMusicPlatformLinks(album, platform);

  return NextResponse.json({
    source: "default",
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
