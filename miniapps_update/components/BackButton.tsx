"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { getPreviousPath } from "./NavigationTracker";

export default function BackButton({
  fallback = "/",
  label = "Назад",
  className = "fs-icon-button w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all duration-200",
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
