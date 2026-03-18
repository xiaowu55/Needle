import Link from "next/link";
import { FavoriteButton } from "@/components/favorite-button";
import { FavoritesLink } from "@/components/favorites-link";
import { PlatformPlayBar } from "@/components/platform-play-bar";
import { SettingsLink } from "@/components/settings-link";
import {
  getAlbumDetailHref,
  getAlbumForDate,
} from "@/lib/albums";
import { getAlbumCoverUrl } from "@/lib/covers";

export const dynamic = "force-dynamic";

const timeZone = process.env.ALBUM_TIMEZONE || "Asia/Shanghai";

export default async function HomePage() {
  const { album, dateKey } = getAlbumForDate(new Date(), timeZone);
  const coverUrl = await getAlbumCoverUrl(album);
  const detailUrl = getAlbumDetailHref(album.rank);

  return (
    <main className="editor-shell">
      <section className="editor-page home-page">
        <div className="editor-header">
          <p className="editor-kicker">Today&apos;s album · {dateKey}</p>
          <div className="header-links">
            <FavoritesLink />
            <SettingsLink />
          </div>
        </div>

        <section className="home-hero">
          <div className="home-copy">
            <p className="rank-outline">{album.rank}</p>
            <h1 className="poster-title">
              {album.artist}, <span>&lsquo;{album.album}&rsquo;</span>
            </h1>
            <p className="poster-subtitle">
              {album.label || "Needle"}, {album.year}
            </p>
          </div>

          <figure className="poster-cover-frame home-cover-frame">
            <img className="poster-cover-image" src={coverUrl} alt={album.album} />
          </figure>
        </section>

        <PlatformPlayBar artist={album.artist} album={album.album} />

        <div className="poster-actions">
          <Link href={detailUrl} className="editor-button editor-button-dark">
            阅读详情
          </Link>
          <FavoriteButton rank={album.rank} />
        </div>

        <hr className="editor-divider" />

        <p className="poster-excerpt home-excerpt">{album.desc}</p>
      </section>
    </main>
  );
}
