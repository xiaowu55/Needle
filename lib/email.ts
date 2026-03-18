import { Album, getSpotifySearchUrl } from "@/lib/albums";
import { getAlbumCoverUrl } from "@/lib/covers";

type SendAlbumEmailArgs = {
  album: Album;
  dateKey: string;
};

export async function sendAlbumEmail({ album, dateKey }: SendAlbumEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALBUM_EMAIL_TO;
  const from = process.env.ALBUM_EMAIL_FROM;

  if (!apiKey || !to || !from) {
    return {
      skipped: true,
      reason: "Missing RESEND_API_KEY, ALBUM_EMAIL_TO, or ALBUM_EMAIL_FROM.",
    };
  }

  const spotifyUrl = getSpotifySearchUrl(album);
  const coverUrl = await getAlbumCoverUrl(album);
  const html = `
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <p style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280;">Needle · ${dateKey}</p>
      <img src="${coverUrl}" alt="${album.album}" style="display: block; width: 100%; max-width: 320px; border-radius: 20px; margin-bottom: 20px;" />
      <h1 style="margin-bottom: 8px;">${album.album}</h1>
      <p style="font-size: 18px; margin-top: 0;">${album.artist} · ${album.year}</p>
      <p style="line-height: 1.6; color: #111827;">${album.desc}</p>
      <p style="color: #4b5563;">Genre: ${album.genre} · Rank: #${album.rank}</p>
      <p>
        <a href="${spotifyUrl}" style="display: inline-block; padding: 12px 18px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 999px;">
          Open in Spotify
        </a>
      </p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Needle: ${album.album} - ${album.artist}`,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email: ${response.status} ${errorText}`);
  }

  return response.json();
}
