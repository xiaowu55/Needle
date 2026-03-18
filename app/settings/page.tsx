import Link from "next/link";
import { FavoritesLink } from "@/components/favorites-link";
import { MusicPlatformSettings } from "@/components/music-platform-settings";
import { PushSettings } from "@/components/push-settings";

export const dynamic = "force-dynamic";

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

        <section className="push-panel">
          <div className="push-panel-copy">
            <p className="editor-kicker">Coming next</p>
            <h2 className="push-panel-title">导入自己的专辑列表</h2>
            <p className="push-panel-text">
              后续允许导入你自己的想听专辑，不再局限于 Rolling Stone Top 500。
            </p>
          </div>

          <div className="poster-actions push-actions">
            <button type="button" className="editor-button" disabled>
              即将开放
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
