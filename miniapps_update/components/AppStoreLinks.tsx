"use client";

import type { MouseEvent } from "react";

const stores = [
  { name: "App Store", caption: "Загрузите в", href: "https://apps.apple.com/kz/app/foodsave/id6809133516" },
  { name: "Google Play", caption: "Скачайте из", href: "https://play.google.com/store/apps/details?id=com.foodsave.kz" },
];

const cardStyles = `
  .fs-app-download {
    max-width: 360px; margin: 24px auto 0; padding-top: 24px; border-top: 1px solid #e9ece9;
    font-family: Inter, system-ui, sans-serif;
  }
  .fs-app-download__brand {
    display: flex; align-items: center; justify-content: center; gap: 12px;
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
    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px; width: 100%; margin: 16px auto 0;
  }
  .fs-app-download__link {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    min-height: 62px; padding: 10px 12px; box-sizing: border-box;
    border: 1px solid #e3e6e4; border-radius: 14px; background: #f3f4f3;
    color: #282e2a; text-decoration: none; box-shadow: 0 1px 2px rgba(22, 35, 27, .04);
  }
  .fs-app-download__store-icon { display: block; width: 24px; height: 28px; flex-shrink: 0; }
  .fs-app-download__store-caption { display: block; color: #69706b; font-size: 10px; line-height: 14px; }
  .fs-app-download__store-name { display: block; font-size: 17px; line-height: 22px; font-weight: 550; letter-spacing: -.4px; white-space: nowrap; }
  .fs-app-download__link:focus-visible { outline: 3px solid #4cad73; outline-offset: 4px; }
  .fs-app-download__link:active { background: #e9ece9; }
  @media (hover: hover) {
    .fs-app-download__link:hover { background: #eceeec; border-color: #d6dbd7; }
  }
  @media (max-width: 359px) {
    .fs-app-download__stores { gap: 10px; }
    .fs-app-download__link { gap: 8px; padding-inline: 8px; }
    .fs-app-download__store-icon { width: 22px; height: 26px; }
    .fs-app-download__store-name { font-size: 15px; }
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
            {store.name === "App Store" ? (
              <svg className="fs-app-download__store-icon" viewBox="8 8 21 24" fill="currentColor" aria-hidden="true">
                <path d="M24.76888,20.30068a4.94881,4.94881,0,0,1,2.35656-4.15206,5.06566,5.06566,0,0,0-3.99116-2.15768c-1.67924-.17626-3.30719,1.00483-4.1629,1.00483-.87227,0-2.18977-.98733-3.6085-.95814a5.31529,5.31529,0,0,0-4.47292,2.72787c-1.934,3.34842-.49141,8.26947,1.3612,10.97608.9269,1.32535,2.01018,2.8058,3.42763,2.7533,1.38706-.05753,1.9051-.88448,3.5794-.88448,1.65876,0,2.14479.88448,3.591.8511,1.48838-.02416,2.42613-1.33124,3.32051-2.66914a10.962,10.962,0,0,0,1.51842-3.09251A4.78205,4.78205,0,0,1,24.76888,20.30068Z" />
                <path d="M22.03725,12.21089a4.87248,4.87248,0,0,0,1.11452-3.49062,4.95746,4.95746,0,0,0-3.20758,1.65961,4.63634,4.63634,0,0,0-1.14371,3.36139A4.09905,4.09905,0,0,0,22.03725,12.21089Z" />
              </svg>
            ) : (
              <svg className="fs-app-download__store-icon" viewBox="0 0 24 26" fill="none" aria-hidden="true">
                <path d="M2 1.8 13.2 13 2 24.2a1.8 1.8 0 0 1-.5-1.3V3.1c0-.5.2-.9.5-1.3Z" fill="#4285F4" />
                <path d="m2 1.8 14.3 8.3-3.1 2.9L2 1.8Z" fill="#34A853" />
                <path d="m13.2 13 3.1-2.9 5.1 2.2q1.2.7 0 1.4l-5.1 2.2-3.1-2.9Z" fill="#FBBC04" />
                <path d="m2 24.2 11.2-11.2 3.1 2.9L2 24.2Z" fill="#EA4335" />
              </svg>
            )}
            <span>
              <span className="fs-app-download__store-caption">{store.caption}</span>
              <span className="fs-app-download__store-name">{store.name}</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
