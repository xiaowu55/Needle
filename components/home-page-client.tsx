"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FavoriteButton } from "@/components/favorite-button";
import { FavoritesLink } from "@/components/favorites-link";
import { PlatformPlayBar } from "@/components/platform-play-bar";
import { SettingsLink } from "@/components/settings-link";
import {
  CUSTOM_LIBRARY_EVENT,
  CUSTOM_RECOMMENDATION_COOKIE,
  parseRecommendationCookieValue,
  RECOMMENDATION_HISTORY_EVENT,
  RECOMMENDATION_SETTINGS_EVENT,
  syncCustomRecommendationSnapshot,
  type CustomRecommendationSnapshot,
} from "@/lib/custom-library";
import type { Album } from "@/lib/albums";

type DefaultHomeRecommendation = {
  source: "default";
  dateKey: string;
  album: Album;
  coverUrl: string;
  detailUrl: string;
};

type HomePageClientProps = {
  fallback: DefaultHomeRecommendation;
  initialCustom: CustomRecommendationSnapshot | null;
  timeZone: string;
};

type ActiveRecommendation =
  | DefaultHomeRecommendation
  | {
      source: "custom";
      dateKey: string;
      album: CustomRecommendationSnapshot["album"];
    };

function readCookieSnapshot() {
  if (typeof document === "undefined") {
    return null;
  }

  const cookieValue = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CUSTOM_RECOMMENDATION_COOKIE}=`))
    ?.slice(CUSTOM_RECOMMENDATION_COOKIE.length + 1);

  return parseRecommendationCookieValue(cookieValue);
}

export function HomePageClient({
  fallback,
  initialCustom,
  timeZone,
}: HomePageClientProps) {
  const [activeRecommendation, setActiveRecommendation] = useState<ActiveRecommendation>(
    initialCustom
      ? {
          source: "custom",
          dateKey: initialCustom.dateKey,
          album: initialCustom.album,
        }
      : fallback,
  );

  useEffect(() => {
    const syncRecommendation = () => {
      const snapshot = syncCustomRecommendationSnapshot(timeZone) || readCookieSnapshot();

      if (!snapshot) {
        setActiveRecommendation(fallback);
        return;
      }

      setActiveRecommendation({
        source: "custom",
        dateKey: snapshot.dateKey,
        album: snapshot.album,
      });
    };

    syncRecommendation();

    window.addEventListener(CUSTOM_LIBRARY_EVENT, syncRecommendation as EventListener);
    window.addEventListener(RECOMMENDATION_SETTINGS_EVENT, syncRecommendation as EventListener);
    window.addEventListener(RECOMMENDATION_HISTORY_EVENT, syncRecommendation as EventListener);
    window.addEventListener("storage", syncRecommendation);

    return () => {
      window.removeEventListener(CUSTOM_LIBRARY_EVENT, syncRecommendation as EventListener);
      window.removeEventListener(RECOMMENDATION_SETTINGS_EVENT, syncRecommendation as EventListener);
      window.removeEventListener(RECOMMENDATION_HISTORY_EVENT, syncRecommendation as EventListener);
      window.removeEventListener("storage", syncRecommendation);
    };
  }, [fallback, timeZone]);

  const isCustom = activeRecommendation.source === "custom";

  return (
    <main className="editor-shell">
      <section className="editor-page home-page">
        <div className="editor-header">
          <p className="editor-kicker">
            {isCustom ? "Today's pick" : "Today's album"} · {activeRecommendation.dateKey}
          </p>
          <div className="header-links">
            <FavoritesLink />
            <SettingsLink />
          </div>
        </div>

        <section className="home-hero">
          <div className="home-copy">
            {isCustom ? (
              <p className="custom-source-mark">MY</p>
            ) : (
              <p className="rank-outline">{activeRecommendation.album.rank}</p>
            )}
            <h1 className="poster-title">
              {activeRecommendation.album.artist}, <span>&lsquo;{activeRecommendation.album.album}&rsquo;</span>
            </h1>
            <p className="poster-subtitle">
              {isCustom
                ? `Custom library${activeRecommendation.album.year ? `, ${activeRecommendation.album.year}` : ""}`
                : `${activeRecommendation.album.label || "Needle"}, ${activeRecommendation.album.year}`}
            </p>
          </div>

          {isCustom ? (
            <figure className="poster-cover-frame home-cover-frame custom-cover-frame">
              <div className="custom-cover-card">
                <p className="editor-kicker">Browser-local</p>
                <p className="custom-cover-title">{activeRecommendation.album.album}</p>
                <p className="custom-cover-meta">{activeRecommendation.album.artist}</p>
              </div>
            </figure>
          ) : (
            <figure className="poster-cover-frame home-cover-frame">
              <img
                className="poster-cover-image"
                src={activeRecommendation.coverUrl}
                alt={activeRecommendation.album.album}
              />
            </figure>
          )}
        </section>

        <PlatformPlayBar artist={activeRecommendation.album.artist} album={activeRecommendation.album.album} />

        <div className="poster-actions">
          {isCustom ? (
            <Link href="/settings" className="editor-button editor-button-dark">
              管理自定义库
            </Link>
          ) : (
            <>
              <Link href={fallback.detailUrl} className="editor-button editor-button-dark">
                阅读详情
              </Link>
              <FavoriteButton rank={fallback.album.rank} />
            </>
          )}
        </div>

        <hr className="editor-divider" />

        <p className="poster-excerpt home-excerpt">
          {isCustom
            ? activeRecommendation.album.notes ||
              activeRecommendation.album.sourceText ||
              "来自你的自定义专辑库。"
            : fallback.album.desc}
        </p>
      </section>
    </main>
  );
}
