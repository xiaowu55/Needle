import { cookies } from "next/headers";
import { HomePageClient } from "@/components/home-page-client";
import {
  getAlbumDetailHref,
  getAlbumForDate,
} from "@/lib/albums";
import { getAlbumCoverUrl } from "@/lib/covers";
import {
  CUSTOM_RECOMMENDATION_COOKIE,
  parseRecommendationCookieValue,
} from "@/lib/custom-library";

export const dynamic = "force-dynamic";

const timeZone = process.env.ALBUM_TIMEZONE || "Asia/Shanghai";

export default async function HomePage() {
  const cookieStore = await cookies();
  const { album, dateKey } = getAlbumForDate(new Date(), timeZone);
  const coverUrl = await getAlbumCoverUrl(album);
  const detailUrl = getAlbumDetailHref(album.rank);
  const snapshot = parseRecommendationCookieValue(
    cookieStore.get(CUSTOM_RECOMMENDATION_COOKIE)?.value,
  );
  const initialCustom = snapshot?.dateKey === dateKey ? snapshot : null;

  return (
    <HomePageClient
      fallback={{
        source: "default",
        dateKey,
        album,
        coverUrl,
        detailUrl,
      }}
      initialCustom={initialCustom}
      timeZone={timeZone}
    />
  );
}
