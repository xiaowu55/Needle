import { NextRequest, NextResponse } from "next/server";
import {
  getAlbumByRank,
  getAlbumDetailHref,
  getMusicPlatformLinks,
  normalizeMusicPlatform,
  getSpotifySearchUrl,
} from "@/lib/albums";
import { getAlbumCoverUrl } from "@/lib/covers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ranksParam = request.nextUrl.searchParams.get("ranks") || "";
  const platform = normalizeMusicPlatform(request.nextUrl.searchParams.get("platform"));
  const ranks = [...new Set(
    ranksParam
      .split(",")
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => Number.isFinite(value)),
  )];

  const albums = await Promise.all(
    ranks.map(async (rank) => {
      const album = getAlbumByRank(rank);

      if (!album) {
        return null;
      }

      return {
        ...album,
        coverUrl: await getAlbumCoverUrl(album),
        detailUrl: getAlbumDetailHref(album.rank),
        spotifyUrl: getSpotifySearchUrl(album),
        platform,
        playUrl: getMusicPlatformLinks(album, platform).webUrl,
        playLinks: getMusicPlatformLinks(album, platform),
      };
    }),
  );

  return NextResponse.json({
    albums: albums.filter(Boolean),
  });
}
