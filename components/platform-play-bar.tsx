"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_MUSIC_PLATFORM,
  MUSIC_PLATFORM_EVENT,
  readMusicPlatformPreference,
  type MusicPlatform,
} from "@/lib/music-platform";
import { getMusicPlatformLinks } from "@/lib/albums";

type PlatformPlayBarProps = {
  artist: string;
  album: string;
  playLabel?: string;
};

export function PlatformPlayBar({
  artist,
  album,
  playLabel = "播放完整专辑",
}: PlatformPlayBarProps) {
  const [platform, setPlatform] = useState<MusicPlatform>(DEFAULT_MUSIC_PLATFORM);

  useEffect(() => {
    const syncPlatform = () => {
      setPlatform(readMusicPlatformPreference());
    };

    syncPlatform();
    window.addEventListener(MUSIC_PLATFORM_EVENT, syncPlatform as EventListener);
    window.addEventListener("storage", syncPlatform);

    return () => {
      window.removeEventListener(MUSIC_PLATFORM_EVENT, syncPlatform as EventListener);
      window.removeEventListener("storage", syncPlatform);
    };
  }, []);

  const links = useMemo(
    () => getMusicPlatformLinks({ artist, album }, platform),
    [album, artist, platform],
  );

  return (
    <div className="play-bar">
      <a
        href={links.webUrl}
        className="play-link"
        onClick={(event) => {
          if (!links.appUrl || links.appUrl === links.webUrl) {
            return;
          }

          event.preventDefault();

          const fallback = window.setTimeout(() => {
            window.location.href = links.webUrl;
          }, 700);

          const clearFallback = () => {
            window.clearTimeout(fallback);
            document.removeEventListener("visibilitychange", clearOnHidden);
          };

          const clearOnHidden = () => {
            if (document.hidden) {
              clearFallback();
            }
          };

          document.addEventListener("visibilitychange", clearOnHidden, { once: true });
          window.location.href = links.appUrl;
        }}
      >
        {playLabel}
      </a>
      <span className="play-brand">{links.label}</span>
    </div>
  );
}
