"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const NAV_STACK_KEY = "foodsaveNavigationStack";
const MAX_STACK_SIZE = 20;

const normalizeAppPath = (value: unknown) => {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
};

const readNavigationStack = () => {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(NAV_STACK_KEY) || "[]");
    if (!Array.isArray(stored)) return [];

    return stored
      .map(normalizeAppPath)
      .filter((path): path is string => Boolean(path))
      .slice(-MAX_STACK_SIZE);
  } catch {
    return [];
  }
};

const writeNavigationStack = (stack: string[]) => {
  try {
    window.sessionStorage.setItem(NAV_STACK_KEY, JSON.stringify(stack.slice(-MAX_STACK_SIZE)));
  } catch {
    // Navigation must keep working even when Telegram's webview blocks storage.
  }
};

const getCurrentPath = (pathname: string, searchParams: URLSearchParams) => {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
};

export function getPreviousPath(fallback: string) {
  if (typeof window === "undefined") return fallback;

  const stack = readNavigationStack();
  const current = `${window.location.pathname}${window.location.search}`;

  while (stack.length && stack[stack.length - 1] === current) {
    stack.pop();
  }

  const previous = stack.pop();
  writeNavigationStack(stack);

  return previous || normalizeAppPath(fallback) || "/";
}

export function resetNavigationStack(returnPath = "/") {
  if (typeof window === "undefined") return;

  const normalizedPath = normalizeAppPath(returnPath) || "/";
  writeNavigationStack([normalizedPath]);
}

export default function NavigationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentPath = getCurrentPath(pathname, searchParams);
    const stack = readNavigationStack();

    if (stack[stack.length - 1] !== currentPath) {
      stack.push(currentPath);
      writeNavigationStack(stack);
    }
  }, [pathname, searchParams]);

  return null;
}
