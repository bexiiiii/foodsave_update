"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { getPreviousPath } from "./NavigationTracker";

export default function BackButton({
  fallback = "/",
  label = "Назад",
  className = "w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300",
}: {
  fallback?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  const goBack = () => {
    router.push(getPreviousPath(fallback));
  };

  return (
    <button aria-label={label} className={className} onClick={goBack} type="button">
      <ArrowLeft className="w-5 h-5 text-gray-800" />
    </button>
  );
}
