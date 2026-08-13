"use client";

import { useEffect } from "react";
import { Heart, X } from "lucide-react";

interface FavoriteToastProps {
  message: string | null;
  onClose: () => void;
}

export default function FavoriteToast({ message, onClose }: FavoriteToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-[60] w-[calc(100%-32px)] max-w-sm -translate-x-1/2 px-0">
      <div
        className="flex items-center gap-3 rounded-2xl bg-black/85 px-4 py-3 shadow-xl backdrop-blur"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
          <Heart className="h-4 w-4 text-amber-400" fill="currentColor" />
        </div>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">{message}</p>
        <button type="button" onClick={onClose} aria-label="Закрыть" className="shrink-0 text-white/50">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
