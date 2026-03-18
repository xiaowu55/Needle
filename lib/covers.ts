import { Album } from "@/lib/albums";

type ItunesResult = {
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  artworkUrl60?: string;
};

type ItunesResponse = {
  resultCount: number;
  results: ItunesResult[];
};

function upgradeArtworkUrl(url?: string) {
  if (!url) {
    return "";
  }

  return url.replace(/\/([0-9]+x[0-9]+)(bb)?\./, "/600x600bb.");
}

export function getFallbackCoverSvg(album: Pick<Album, "album" | "artist">) {
  const title = `${album.album} · ${album.artist}`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f7e2b8" />
          <stop offset="100%" stop-color="#b6472a" />
        </linearGradient>
      </defs>
      <rect width="1200" height="1200" fill="url(#bg)" rx="72" />
      <circle cx="600" cy="600" r="360" fill="rgba(255,255,255,0.14)" />
      <circle cx="600" cy="600" r="92" fill="#161616" />
      <text x="100" y="1040" fill="#161616" font-size="72" font-family="Georgia, serif">${escapeXml(
        title,
      )}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function findAlbumCover(album: Pick<Album, "album" | "artist">) {
  const term = encodeURIComponent(`${album.artist} ${album.album}`);
  const response = await fetch(
    `https://itunes.apple.com/search?term=${term}&entity=album&limit=5`,
    {
      next: { revalidate: 60 * 60 * 24 * 30 },
    },
  );

  if (!response.ok) {
    return "";
  }

  const data = (await response.json()) as ItunesResponse;
  const normalizedAlbum = album.album.toLowerCase();
  const normalizedArtist = album.artist.toLowerCase();

  const bestMatch =
    data.results.find((item) => {
      const artistName = item.artistName?.toLowerCase() || "";
      const collectionName = item.collectionName?.toLowerCase() || "";
      return (
        artistName.includes(normalizedArtist) &&
        collectionName.includes(normalizedAlbum)
      );
    }) ?? data.results[0];

  return upgradeArtworkUrl(bestMatch?.artworkUrl100 || bestMatch?.artworkUrl60);
}

export async function getAlbumCoverUrl(
  album: Pick<Album, "album" | "artist" | "cover">,
) {
  if (album.cover) {
    return album.cover;
  }

  const externalCover = await findAlbumCover(album);
  return externalCover || getFallbackCoverSvg(album);
}
