"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "album-daily:favorites";
const EVENT_NAME = "album-daily:favorites-change";

function sortRanks(ranks: number[]) {
  return [...new Set(ranks)].sort((a, b) => a - b);
}

export function readFavoriteRanks() {
  if (typeof window === "undefined") {
    return [] as number[];
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortRanks(
      parsed.filter((value): value is number => typeof value === "number"),
    );
  } catch {
    return [];
  }
}

function writeFavoriteRanks(ranks: number[]) {
  if (typeof window === "undefined") {
    return;
  }

  const nextRanks = sortRanks(ranks);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRanks));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: nextRanks }));
}

export function toggleFavoriteRank(rank: number) {
  const currentRanks = readFavoriteRanks();
  const nextRanks = currentRanks.includes(rank)
    ? currentRanks.filter((value) => value !== rank)
    : [...currentRanks, rank];

  writeFavoriteRanks(nextRanks);
  return nextRanks;
}

export function useFavoriteRanks() {
  const [favoriteRanks, setFavoriteRanks] = useState<number[]>([]);

  useEffect(() => {
    const syncFavorites = () => {
      setFavoriteRanks(readFavoriteRanks());
    };

    syncFavorites();
    window.addEventListener(EVENT_NAME, syncFavorites as EventListener);
    window.addEventListener("storage", syncFavorites);

    return () => {
      window.removeEventListener(EVENT_NAME, syncFavorites as EventListener);
      window.removeEventListener("storage", syncFavorites);
    };
  }, []);

  const toggle = useCallback((rank: number) => {
    const nextRanks = toggleFavoriteRank(rank);
    setFavoriteRanks(nextRanks);
  }, []);

  return useMemo(
    () => ({
      favoriteRanks,
      hasFavorite: (rank: number) => favoriteRanks.includes(rank),
      toggle,
    }),
    [favoriteRanks, toggle],
  );
}
