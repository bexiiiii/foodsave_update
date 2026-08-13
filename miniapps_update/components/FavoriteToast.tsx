"use client";

import { useEffect } from "react";
import { Star, X } from "lucide-react";

interface FavoriteToastProps {
  title: string | null;
  itemName?: string;
  onClose: () => void;
}

export default function FavoriteToast({ title, itemName, onClose }: FavoriteToastProps) {
  useEffect(() => {
    if (!title) return;
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [title, onClose]);

  if (!title) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-[60] w-[calc(100%-32px)] max-w-sm -translate-x-1/2 px-0">
      <div
        className="flex items-center gap-3 rounded-2xl bg-black/85 px-4 py-3 shadow-xl backdrop-blur"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
          <Star className="h-4 w-4 text-amber-400" fill="currentColor" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{title}</p>
          {itemName && <p className="truncate text-xs text-white/60">{itemName}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Закрыть" className="shrink-0 text-white/50">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
