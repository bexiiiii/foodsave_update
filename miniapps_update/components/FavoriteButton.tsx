"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { apiClient } from "../lib/api";

interface FavoriteButtonProps {
  type: "store" | "product";
  id: number;
  initialFavorite?: boolean;
  className?: string;
}

export default function FavoriteButton({ type, id, initialFavorite, className }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(!!initialFavorite);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading) return;

    const previousValue = isFavorite;
    setIsFavorite(!previousValue);
    setIsLoading(true);
    try {
      if (type === "store") {
        await apiClient.toggleFavoriteStore(id, previousValue);
      } else {
        await apiClient.toggleFavoriteProduct(id, previousValue);
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      setIsFavorite(previousValue);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={
        className ??
        "w-9 h-9 flex items-center justify-center rounded-full bg-white/90 shadow-sm active:scale-90 transition-transform flex-shrink-0"
      }
      aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
    >
      <Star
        className="w-5 h-5"
        fill={isFavorite ? "#f5b301" : "none"}
        stroke={isFavorite ? "#f5b301" : "#00000066"}
      />
    </button>
  );
}
