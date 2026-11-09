"use client";

import type { MouseEvent } from "react";

const stores = [
  { name: "App Store", href: "https://apps.apple.com/kz/app/foodsave/id6809133516", badge: "/brand/app-store-badge-ru.svg", width: 126, height: 42 },
  { name: "Google Play", href: "https://play.google.com/store/apps/details?id=com.foodsave.kz", badge: "/brand/google-play-badge-ru.png", width: 143, height: 55.34 },
];

const cardStyles = `
  .fs-app-download {
    margin-top: 28px; overflow: hidden; border: 1px solid #dce8df;
    border-radius: 26px; background: #f4f8f1;
    box-shadow: 0 10px 28px -22px rgba(14, 55, 36, .3);
    font-family: Inter, system-ui, sans-serif;
  }
  .fs-app-download__story {
    position: relative; isolation: isolate; padding: 24px; overflow: hidden;
    background: #164b35; color: #fff;
  }
  .fs-app-download__story::after {
    content: ""; position: absolute; z-index: -1; width: 210px; height: 270px;
    right: -116px; top: -60px; border: 1px solid rgba(185, 222, 167, .14);
    border-radius: 50%; transform: rotate(-28deg); pointer-events: none;
    box-shadow: 0 0 0 24px rgba(185, 222, 167, .035), 0 0 0 48px rgba(185, 222, 167, .025);
  }
  .fs-app-download__brand {
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; margin-bottom: 20px;
  }
  .fs-app-download__brand-name {
    display: block; font-size: 20px; line-height: 25px; font-weight: 650; letter-spacing: -.65px;
  }
  .fs-app-download__eyebrow {
    display: block; margin-top: 3px; color: #bcd7c6; font-size: 11px; line-height: 16px; letter-spacing: .1px;
  }
  .fs-app-download__icon {
    display: block; flex-shrink: 0; width: 56px; height: 56px;
    border-radius: 17px; box-shadow: 0 6px 16px rgba(3, 24, 13, .14);
  }
  .fs-app-download__title {
    margin: 0; font-size: clamp(25px, 7vw, 30px); line-height: 1.1;
    font-weight: 650; letter-spacing: -1px; text-wrap: balance;
  }
  .fs-app-download__title span { color: #c7e7ad; }
  .fs-app-download__description {
    max-width: 270px; margin: 12px 0 0; font-size: 13px; line-height: 19px; color: #d2e3d8;
  }
  .fs-app-download__stores {
    display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
    gap: 2px 12px; padding: 12px 18px;
  }
  .fs-app-download__link {
    display: flex; align-items: center; justify-content: center; min-height: 56px;
    border-radius: 9px; text-decoration: none; transition: transform 160ms ease, opacity 160ms ease;
  }
  .fs-app-download__link:focus-visible { outline: 3px solid #4cad73; outline-offset: 4px; }
  .fs-app-download__link:active { transform: scale(.97); }
  @media (hover: hover) {
    .fs-app-download__link:hover { transform: translateY(-2px); opacity: .86; }
  }
  @media (min-width: 640px) {
    .fs-app-download { display: grid; grid-template-columns: minmax(0, 1fr) auto; }
    .fs-app-download__story { padding: 28px 32px; }
    .fs-app-download__brand { max-width: 330px; }
    .fs-app-download__stores { flex-direction: column; gap: 6px; padding: 24px 32px; }
    .fs-app-download__title { font-size: 32px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .fs-app-download__link { transition: none; }
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
      <div className="fs-app-download__story">
        <div className="fs-app-download__brand">
          <div>
            <span className="fs-app-download__brand-name">FoodSave</span>
            <span className="fs-app-download__eyebrow">Приложение для iOS и Android</span>
          </div>
          {/* Official FoodSave app icon from its App Store listing. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="fs-app-download__icon" src="/brand/foodsave-app-icon.jpg" alt="" width={56} height={56} loading="lazy" />
        </div>
        <h2 className="fs-app-download__title">Вкусная еда.<br /><span>Всегда под рукой.</span></h2>
        <p className="fs-app-download__description">Любимые боксы и новые находки —<br />в приложении FoodSave.</p>
      </div>
      <div className="fs-app-download__stores">
        {stores.map((store) => (
          <a
            key={store.name}
            className="fs-app-download__link"
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
