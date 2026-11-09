"use client";

import type { MouseEvent } from "react";

const stores = [
  { name: "App Store", platform: "iPhone · iPad", href: "https://apps.apple.com/kz/app/foodsave/id6809133516" },
  { name: "Google Play", platform: "Android", href: "https://play.google.com/store/apps/details?id=com.foodsave.kz" },
];

function openStore(event: MouseEvent<HTMLAnchorElement>) {
  const telegram = window.Telegram?.WebApp;
  if (telegram?.openLink) {
    try {
      telegram.openLink(event.currentTarget.href);
      event.preventDefault();
    } catch {
      // Keep the native link available if Telegram cannot open it.
    }
  }
}

export default function AppStoreLinks() {
  return (
    <section
      aria-label="FoodSave — App Store / Google Play"
      style={{ marginTop: 24, padding: 16, borderRadius: 20, background: "#EDF7F0", color: "#173E2C" }}
    >
      <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700 }}>FoodSave · iOS & Android</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {stores.map((store) => (
          <a
            key={store.name}
            href={store.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={openStore}
            aria-label={`FoodSave — ${store.name}`}
            style={{ display: "flex", flex: "1 1 130px", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 58, padding: "10px 12px", borderRadius: 14, background: "#173E2C", color: "#FFFFFF", textDecoration: "none" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4" />
            </svg>
            <span>
              <span style={{ display: "block", fontSize: 11, lineHeight: "16px", opacity: 0.8 }}>{store.platform}</span>
              <span style={{ display: "block", fontSize: 16, lineHeight: "22px", fontWeight: 700, whiteSpace: "nowrap" }}>{store.name}</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
