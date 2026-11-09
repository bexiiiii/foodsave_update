"use client";

import type { MouseEvent } from "react";

const stores = [
  { name: "App Store", href: "https://apps.apple.com/kz/app/foodsave/id6809133516", badge: "/brand/app-store-badge-ru.svg", width: 126, height: 42 },
  { name: "Google Play", href: "https://play.google.com/store/apps/details?id=com.foodsave.kz", badge: "/brand/google-play-badge-ru.png", width: 143, height: 55.34 },
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
      style={{ marginTop: 24, padding: 18, borderRadius: 24, border: "1px solid #DFEDE3", background: "linear-gradient(135deg, #FAFCF8 0%, #EDF7F0 100%)", color: "#173E2C", boxShadow: "0 12px 32px -24px rgba(28, 74, 49, 0.3)" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Official FoodSave app icon from its App Store listing. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/foodsave-app-icon.jpg" alt="" width={60} height={60} loading="lazy" style={{ display: "block", flexShrink: 0, borderRadius: 18, border: "1px solid rgba(23, 62, 44, 0.06)", boxShadow: "0 4px 12px rgba(23, 62, 44, 0.06)" }} />
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 23, lineHeight: "28px", letterSpacing: "-0.7px", fontWeight: 750 }}>FoodSave</h2>
          <p style={{ margin: "4px 0 0", maxWidth: 240, fontSize: 13, lineHeight: "19px", color: "#597466" }}>Любимые боксы — всегда под рукой.</p>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "2px 12px", marginTop: 14 }}>
        {stores.map((store) => (
          <a
            key={store.name}
            href={store.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={openStore}
            aria-label={`FoodSave — ${store.name}`}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 56, borderRadius: 8, textDecoration: "none" }}
          >
            {/* Keep the official badge artwork and its proportions intact. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={store.badge} alt={store.name === "App Store" ? "Загрузите в App Store" : "Скачайте из Google Play"} width={store.width} height={store.height} loading="lazy" style={{ display: "block", width: store.width, height: "auto" }} />
          </a>
        ))}
      </div>
    </section>
  );
}
