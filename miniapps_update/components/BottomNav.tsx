"use client";

import Link from "next/link";
import { useOrders } from "../hooks/useData";
import { safeArray } from "../lib/api";
import { isActiveOrder } from "../lib/orders";

type BottomNavProps = {
  active?: "home" | "markets" | "orders" | "profile";
};

export default function BottomNav({ active = "home" }: BottomNavProps) {
  const { orders } = useOrders();
  const activeOrdersCount = safeArray(orders).filter(isActiveOrder).length;

  const itemClass = (item: BottomNavProps["active"]) =>
    `w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-95 ${
      active === item ? "bg-[#4CAD73] shadow-[0_6px_18px_rgba(76,173,115,0.24)]" : "bg-white"
    }`;

  const iconClass = (item: BottomNavProps["active"]) =>
    `w-6 h-6 transition-transform duration-300 ${active === item ? "text-white" : "text-black"}`;

  return (
    <nav className="fs-bottom-nav fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl px-4 py-3 safe-area-inset-bottom md:bottom-5 md:left-1/2 md:right-auto md:w-[min(620px,calc(100%-48px))] md:-translate-x-1/2 md:rounded-2xl md:border md:border-black/[0.06] md:px-6 md:shadow-[0_14px_42px_rgba(20,45,24,0.14)]">
      <div className="flex items-center justify-around md:justify-between">
        <Link href="/" className="flex flex-col items-center gap-1 group">
          <div className={itemClass("home")}>
            <svg className={iconClass("home")} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        </Link>

        <Link href="/markets" className="flex flex-col items-center gap-1 group">
          <div className={itemClass("markets")}>
            <svg className={iconClass("markets")} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </Link>

        <Link href="/orders" className="flex flex-col items-center gap-1 group">
          <div className={`relative ${itemClass("orders")}`}>
            <svg className={iconClass("orders")} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {activeOrdersCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#de8a08] px-1.5 text-[10px] font-bold text-white ring-2 ring-white">
                {activeOrdersCount > 9 ? "9+" : activeOrdersCount}
              </span>
            )}
          </div>
        </Link>

        <Link href="/profile" className="flex flex-col items-center gap-1 group">
          <div className={itemClass("profile")}>
            <svg className={iconClass("profile")} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </Link>
      </div>
    </nav>
  );
}
