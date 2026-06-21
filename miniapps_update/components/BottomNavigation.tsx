"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOrders } from "../hooks/useData";
import { isActiveOrder } from "../lib/orders";

type NavItem = {
  href: string;
  key: "home" | "markets" | "orders" | "profile";
  label: string;
  iconPath: string;
};

const navItems: NavItem[] = [
  {
    href: "/",
    key: "home",
    label: "Главная",
    iconPath:
      "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    href: "/markets",
    key: "markets",
    label: "Поиск",
    iconPath: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  },
  {
    href: "/orders",
    key: "orders",
    label: "Заказы",
    iconPath:
      "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    href: "/profile",
    key: "profile",
    label: "Профиль",
    iconPath:
      "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
];

const isActivePath = (pathname: string, href: string) => {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

export default function BottomNavigation() {
  const pathname = usePathname();
  const { orders } = useOrders();
  const activeOrderCount = orders.filter(isActiveOrder).length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-gray-100 rounded-t-3xl px-4 py-3 safe-area-inset-bottom">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Link key={item.key} href={item.href} className="flex flex-col items-center gap-1 group" aria-label={item.label}>
              <div
                className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-95 ${
                  active ? "bg-[#73be61]" : "bg-white group-hover:bg-gray-50"
                }`}
              >
                <svg
                  className={`w-6 h-6 transition-transform duration-300 ${active ? "text-white" : "text-black"}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.iconPath} />
                </svg>

                {item.key === "orders" && activeOrderCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-5 h-5 rounded-full bg-red-500 px-1 text-[10px] font-bold leading-5 text-white text-center">
                    {activeOrderCount > 9 ? "9+" : activeOrderCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
