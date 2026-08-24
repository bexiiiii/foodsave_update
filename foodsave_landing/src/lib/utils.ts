import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKztPrice(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(Math.round(value))} ₸`;
}
