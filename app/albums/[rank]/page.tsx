import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/favorite-button";
import { FavoritesLink } from "@/components/favorites-link";
import { PlatformPlayBar } from "@/components/platform-play-bar";
import { SettingsLink } from "@/components/settings-link";
import { ShareButton } from "@/components/share-button";
import {
  getAlbumByRank,
  getAlbumDetailHref,
  getAlbumList,
} from "@/lib/albums";
import { getAlbumCoverUrl } from "@/lib/covers";

export const dynamic = "force-dynamic";

type AlbumPageProps = {
  params: Promise<{
    rank: string;
  }>;
};

export async function generateStaticParams() {
  return getAlbumList().map((album) => ({
    rank: String(album.rank),
  }));
}

export async function generateMetadata({
  params,
}: AlbumPageProps): Promise<Metadata> {
  const { rank } = await params;
  const album = getAlbumByRank(Number.parseInt(rank, 10));

  if (!album) {
    return {};
  }

  return {
    title: `${album.artist}, '${album.album}'`,
    description: album.desc,
  };
}

export default async function AlbumDetailPage({ params }: AlbumPageProps) {
  const { rank } = await params;
  const album = getAlbumByRank(Number.parseInt(rank, 10));

  if (!album) {
    notFound();
  }

  const coverUrl = await getAlbumCoverUrl(album);
  const currentIndex = album.rank - 1;
  const previousAlbum = currentIndex > 0 ? getAlbumList()[currentIndex - 1] : null;
  const nextAlbum =
    currentIndex < getAlbumList().length - 1 ? getAlbumList()[currentIndex + 1] : null;

  return (
    <main className="editor-shell">
      <article className="editor-page detail-page">
        <div className="editor-header">
          <div className="header-links">
            <Link href="/" className="editor-link">
              今日专辑
            </Link>
            <FavoritesLink />
            <SettingsLink />
          </div>
        </div>

        <section className="detail-hero">
          <div className="detail-copy">
            <p className="rank-outline">{album.rank}</p>
            <h1 className="poster-title">
              {album.artist}, <span>&lsquo;{album.album}&rsquo;</span>
            </h1>
            <p className="poster-subtitle">
              {album.label || "Needle"}, {album.year}
            </p>

            <PlatformPlayBar artist={album.artist} album={album.album} />

            <div className="poster-actions detail-actions">
              <FavoriteButton rank={album.rank} variant="primary" />
              <ShareButton
                title={`${album.artist} - ${album.album}`}
                text={album.desc}
                url={getAlbumDetailHref(album.rank)}
              />
            </div>
          </div>

          <figure className="poster-cover-frame detail-cover-frame">
            <img className="poster-cover-image" src={coverUrl} alt={album.album} />
          </figure>
        </section>

        <hr className="editor-divider" />

        <div className="review-block">
          <p className="review-kicker">乐评</p>
          <p className="review-copy">{album.desc_raw || album.desc}</p>
        </div>

        <nav className="editor-pagination">
          {previousAlbum ? (
            <Link href={getAlbumDetailHref(previousAlbum.rank)} className="editor-link">
              ← #{previousAlbum.rank}
            </Link>
          ) : (
            <span />
          )}

          {nextAlbum ? (
            <Link href={getAlbumDetailHref(nextAlbum.rank)} className="editor-link">
              #{nextAlbum.rank} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>
    </main>
  );
}
