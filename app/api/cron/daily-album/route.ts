import { NextRequest, NextResponse } from "next/server";
import { getAlbumForDate } from "@/lib/albums";
import { sendAlbumEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const timeZone = process.env.ALBUM_TIMEZONE || "Asia/Shanghai";
  const { album, dateKey } = getAlbumForDate(new Date(), timeZone);

  try {
    const result = await sendAlbumEmail({ album, dateKey });
    return NextResponse.json({
      ok: true,
      date: dateKey,
      album: `${album.album} - ${album.artist}`,
      delivery: result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown delivery failure";

    return NextResponse.json(
      {
        ok: false,
        date: dateKey,
        album: `${album.album} - ${album.artist}`,
        error: message,
      },
      { status: 500 },
    );
  }
}
