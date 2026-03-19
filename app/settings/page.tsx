import { CustomLibrarySettings } from "@/components/custom-library-settings";
import Link from "next/link";
import { FavoritesLink } from "@/components/favorites-link";
import { MusicPlatformSettings } from "@/components/music-platform-settings";
import { PushSettings } from "@/components/push-settings";

export const dynamic = "force-dynamic";

const timeZone = process.env.ALBUM_TIMEZONE || "Asia/Shanghai";

export default function SettingsPage() {
  return (
    <main className="editor-shell">
      <section className="editor-page settings-page">
        <div className="editor-header">
          <div className="header-links">
            <Link href="/" className="editor-link">
              今日专辑
            </Link>
            <FavoritesLink />
          </div>
        </div>

        <div className="settings-hero">
          <p className="favorites-kicker">Preferences</p>
          <h1 className="favorites-title">设置</h1>
          <p className="favorites-copy">在这里统一管理默认播放平台、推送提醒和后续扩展能力。</p>
        </div>

        <MusicPlatformSettings />
        <PushSettings />
        <CustomLibrarySettings timeZone={timeZone} />
      </section>
    </main>
  );
}
