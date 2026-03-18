"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFavoriteRanks } from "@/lib/favorites";

type FavoriteAlbum = {
  rank: number;
  artist: string;
  album: string;
  year: number;
  label?: string;
  coverUrl: string;
  detailUrl: string;
};

export function FavoritesPageClient() {
  const { favoriteRanks } = useFavoriteRanks();
  const [albums, setAlbums] = useState<FavoriteAlbum[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadFavorites() {
      if (favoriteRanks.length === 0) {
        setAlbums([]);
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch(`/api/albums?ranks=${favoriteRanks.join(",")}&platform=spotify`);
        const data = (await response.json()) as { albums: FavoriteAlbum[] };
        setAlbums(data.albums);
      } finally {
        setIsLoading(false);
      }
    }

    void loadFavorites();
  }, [favoriteRanks]);

  return (
    <div className="favorites-stack">
      <header className="favorites-header">
        <div>
          <p className="favorites-kicker">Personal archive</p>
          <h1 className="favorites-title">收藏</h1>
        </div>
        <p className="favorites-copy">你喜欢且听过的专辑，会留在这里。</p>
      </header>

      {favoriteRanks.length === 0 ? (
        <section className="favorites-empty">
          <p className="favorites-empty-title">还没有收藏的专辑</p>
          <p className="favorites-empty-copy">
            在详情页点击“收藏专辑”，就会出现在这里。
          </p>
          <Link href="/" className="editor-link">
            去看今日专辑
          </Link>
        </section>
      ) : (
        <section className="favorites-list" aria-busy={isLoading}>
          {albums.map((album) => (
            <Link key={album.rank} href={album.detailUrl} className="favorites-item">
              <img
                className="favorites-cover"
                src={album.coverUrl}
                alt={album.album}
              />
              <div className="favorites-meta">
                <p className="favorites-rank">#{album.rank}</p>
                <h2>{album.album}</h2>
                <p>
                  {album.artist} · {album.year}
                </p>
                <span>{album.label || "Needle"}</span>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
