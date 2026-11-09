"use client";

import type { MouseEvent } from "react";

const stores = [
  { name: "App Store", href: "https://apps.apple.com/kz/app/foodsave/id6809133516", badge: "/brand/app-store-badge-ru.svg", width: 138, height: 46.13 },
  { name: "Google Play", href: "https://play.google.com/store/apps/details?id=com.foodsave.kz", badge: "/brand/google-play-badge-ru.png", width: 157, height: 60.76 },
];

const cardStyles = `
  .fs-app-download {
    margin-top: 28px; padding-top: 24px; border-top: 1px solid #e9ece9;
    font-family: Inter, system-ui, sans-serif;
  }
  .fs-app-download__brand {
    display: flex; align-items: center; gap: 14px;
  }
  .fs-app-download__brand-name {
    margin: 0; color: #17241d; font-size: 18px; line-height: 24px; font-weight: 600; letter-spacing: -.3px;
  }
  .fs-app-download__eyebrow {
    margin: 3px 0 0; color: #69736d; font-size: 12px; line-height: 18px;
  }
  .fs-app-download__icon {
    display: block; flex-shrink: 0; width: 48px; height: 48px;
    border: 1px solid #e9ece9; border-radius: 12px;
  }
  .fs-app-download__stores {
    display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; margin-top: 16px;
  }
  .fs-app-download__link {
    display: flex; align-items: center; justify-content: center; min-height: 62px;
    border-radius: 8px; text-decoration: none;
  }
  .fs-app-download__link:focus-visible { outline: 3px solid #4cad73; outline-offset: 4px; }
  .fs-app-download__link:active { opacity: .75; }
  @media (max-width: 359px) {
    .fs-app-download__stores { gap: 4px 12px; }
    .fs-app-download__link[data-store="App Store"] img { max-width: 126px; }
    .fs-app-download__link[data-store="Google Play"] img { max-width: 143px; }
  }
  @media (min-width: 720px) {
    .fs-app-download { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
    .fs-app-download__stores { margin-top: 0; flex-shrink: 0; }
  }
`;

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
    <section className="fs-app-download" aria-label="FoodSave — App Store / Google Play">
      <style>{cardStyles}</style>
      <div className="fs-app-download__brand">
        {/* Official FoodSave app icon from its App Store listing. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="fs-app-download__icon" src="/brand/foodsave-app-icon.jpg" alt="" width={48} height={48} loading="lazy" />
        <div>
          <h2 className="fs-app-download__brand-name">FoodSave</h2>
          <p className="fs-app-download__eyebrow">Приложение для iOS и Android</p>
        </div>
      </div>
      <div className="fs-app-download__stores">
        {stores.map((store) => (
          <a
            key={store.name}
            className="fs-app-download__link"
            data-store={store.name}
            href={store.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={openStore}
            aria-label={`FoodSave — ${store.name}`}
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
