import { getAlbumForDate, getSpotifySearchUrl } from "@/lib/albums";
import { getAlbumCoverUrl } from "@/lib/covers";

export const dynamic = "force-dynamic";

const timeZone = process.env.ALBUM_TIMEZONE || "Asia/Shanghai";

export default async function WidgetPage() {
  const { album, dateKey } = getAlbumForDate(new Date(), timeZone);
  const coverUrl = await getAlbumCoverUrl(album);
  const spotifyUrl = getSpotifySearchUrl(album);

  return (
    <main className="widget-shell">
      <a
        className="widget-card"
        href={spotifyUrl}
        target="_blank"
        rel="noreferrer"
      >
        <img className="widget-cover" src={coverUrl} alt={album.album} />
        <div className="widget-overlay" />
        <div className="widget-body">
          <p className="widget-eyebrow">{dateKey}</p>
          <h1 className="widget-title">{album.album}</h1>
          <p className="widget-subtitle">
            {album.artist} · #{album.rank}
          </p>
          <p className="widget-note">Tap to open Spotify search</p>
        </div>
      </a>
    </main>
  );
}
