"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_MUSIC_PLATFORM,
  type MusicPlatform,
  readMusicPlatformPreference,
  writeMusicPlatformPreference,
} from "@/lib/music-platform";

const PLATFORM_OPTIONS: Array<{ value: MusicPlatform; label: string; hint: string }> = [
  { value: "spotify", label: "Spotify", hint: "默认推荐，搜索结果最稳定。" },
  { value: "apple-music", label: "Apple Music", hint: "优先尝试打开 Apple Music。" },
  { value: "netease", label: "网易云音乐", hint: "优先尝试打开网易云音乐。" },
  { value: "qq-music", label: "QQ 音乐", hint: "优先尝试打开 QQ 音乐。" },
];

export function MusicPlatformSettings() {
  const [platform, setPlatform] = useState<MusicPlatform>(DEFAULT_MUSIC_PLATFORM);
  const activeOption =
    PLATFORM_OPTIONS.find((option) => option.value === platform) ?? PLATFORM_OPTIONS[0];

  useEffect(() => {
    setPlatform(readMusicPlatformPreference());
  }, []);

  return (
    <section className="push-panel">
      <div className="push-panel-copy">
        <p className="editor-kicker">Playback default</p>
        <h2 className="push-panel-title">默认音乐平台</h2>
        <p className="push-panel-text">
          首页和详情页的主播放按钮会按这里的偏好跳转。优先尝试 App，失败后回退到网页搜索。
        </p>
      </div>

      <div className="push-grid">
        <label className="push-field">
          <span>平台</span>
          <select
            value={platform}
            onChange={(event) => {
              const nextPlatform = event.target.value as MusicPlatform;
              setPlatform(nextPlatform);
              writeMusicPlatformPreference(nextPlatform);
            }}
          >
            {PLATFORM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="push-panel-status">当前选择：{activeOption.label}。{activeOption.hint}</p>
    </section>
  );
}
