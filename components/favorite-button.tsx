"use client";

import { useFavoriteRanks } from "@/lib/favorites";

type FavoriteButtonProps = {
  rank: number;
  variant?: "primary" | "ghost";
};

export function FavoriteButton({
  rank,
  variant = "ghost",
}: FavoriteButtonProps) {
  const { hasFavorite, toggle } = useFavoriteRanks();
  const isFavorite = hasFavorite(rank);

  return (
    <button
      type="button"
      className={`editor-button ${variant === "primary" ? "editor-button-dark" : ""}`}
      aria-pressed={isFavorite}
      onClick={() => toggle(rank)}
    >
      {isFavorite ? "已收藏" : "收藏专辑"}
    </button>
  );
}
