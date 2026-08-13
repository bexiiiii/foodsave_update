"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const NAV_STACK_KEY = "foodsaveNavigationStack";

const getCurrentPath = (pathname: string, searchParams: URLSearchParams) => {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
};

export function getPreviousPath(fallback: string) {
  if (typeof window === "undefined") return fallback;

  try {
    const stack = JSON.parse(sessionStorage.getItem(NAV_STACK_KEY) || "[]") as string[];
    const current = `${window.location.pathname}${window.location.search}`;

    while (stack.length && stack[stack.length - 1] === current) {
      stack.pop();
    }

    const previous = stack.pop();
    sessionStorage.setItem(NAV_STACK_KEY, JSON.stringify(stack));

    return previous || fallback;
  } catch {
    return fallback;
  }
}

export default function NavigationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentPath = getCurrentPath(pathname, searchParams);
    const stack = JSON.parse(sessionStorage.getItem(NAV_STACK_KEY) || "[]") as string[];

    if (stack[stack.length - 1] !== currentPath) {
      stack.push(currentPath);
      sessionStorage.setItem(NAV_STACK_KEY, JSON.stringify(stack.slice(-20)));
    }
  }, [pathname, searchParams]);

  return null;
}
