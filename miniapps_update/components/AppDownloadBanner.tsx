"use client";

import { useEffect, useState } from "react";
import type { MouseEvent } from "react";

export const DOWNLOAD_BANNER_KEY = "foodsave.appDownloadBanner.dismissedUntil.v1";
export const DOWNLOAD_BANNER_WEEK = 7 * 24 * 60 * 60 * 1000;

const appStoreUrl = "https://apps.apple.com/kz/app/foodsave/id6809133516";
const googlePlayUrl = "https://play.google.com/store/apps/details?id=com.foodsave.kz";

export function getDownloadPlatform(userAgent: string, platform: string, touchPoints: number, telegramPlatform?: string) {
  if (telegramPlatform === "ios") return "ios";
  if (telegramPlatform === "android") return "android";
  if (/iPad|iPhone|iPod/i.test(userAgent) || (platform === "MacIntel" && touchPoints > 1)) return "ios";
  return /Android/i.test(userAgent) ? "android" : "other";
}

export function isDownloadBannerDismissed(value: number, now: number) {
  return Number.isFinite(value) && value > now;
}

function readDismissal() {
  let until = 0;
  for (const storageName of ["localStorage", "sessionStorage"] as const) {
    try {
      const value = Number(window[storageName].getItem(DOWNLOAD_BANNER_KEY));
      if (Number.isFinite(value)) until = Math.max(until, value);
    } catch {
      // The banner remains usable when browser storage is unavailable.
    }
  }
  return until;
}

function openStore(event: MouseEvent<HTMLAnchorElement>) {
  try {
    const openLink = window.Telegram?.WebApp?.openLink;
    if (openLink) {
      window.Telegram!.WebApp.openLink!(event.currentTarget.href);
      event.preventDefault();
    }
  } catch {
    // Keep the normal link available if Telegram cannot open it.
  }
}

const styles = `
  .fs-download-banner { max-width: 1280px; margin: 16px auto 0; padding: 0 16px; box-sizing: border-box; font-family: Inter, system-ui, sans-serif; }
  .fs-download-banner__card { display: grid; grid-template-columns: 44px minmax(0, 1fr) 32px; gap: 12px; align-items: center; padding: 16px; border-radius: 16px; }
  .fs-download-banner__icon { display: block; width: 44px; height: 44px; border: 1px solid #e9ece9; border-radius: 12px; }
  .fs-download-banner__title { margin: 0; color: #17241d; font-size: 20px; line-height: 26px; font-weight: 600; letter-spacing: -.4px; }
  .fs-download-banner__text { margin: 4px 0 0; color: #43584a; font-size: 13px; line-height: 18px; font-weight: 500; }
  .fs-download-banner__close { display: flex; justify-content: center; align-items: center; align-self: start; width: 44px; height: 44px; margin: -6px -6px 0; padding: 0; border: 0; border-radius: 50%; background: transparent; color: #747d77; cursor: pointer; }
  .fs-download-banner__actions { grid-column: 1 / -1; display: flex; gap: 10px; margin-top: 4px; }
  .fs-download-banner__link { display: flex; justify-content: center; align-items: center; gap: 8px; flex: 1; min-width: 0; min-height: 56px; padding: 12px 8px; box-sizing: border-box; border-radius: 12px; border: 1px solid transparent; background: #f3f4f3; color: #282e2a; text-decoration: none; font-size: 16px; line-height: 22px; font-weight: 600; letter-spacing: -.4px; white-space: nowrap; }
  .fs-download-banner__close:focus-visible, .fs-download-banner__link:focus-visible { outline: 3px solid #4cad73; outline-offset: 3px; }
  .fs-download-banner__close:active { background: #f3f4f3; }
  .fs-download-banner__link:active { background: #e9ece9; }
  .fs-download-banner__store-icon { display: block; width: 24px; height: 28px; flex-shrink: 0; }
  @media (hover: hover) { .fs-download-banner__link:hover { background: #eceeec; border-color: #d6dbd7; } }
  @media (max-width: 359px) {
    .fs-download-banner__actions { gap: 8px; }
    .fs-download-banner__link { gap: 6px; padding-inline: 6px; font-size: 14px; }
    .fs-download-banner__store-icon { width: 20px; height: 24px; }
  }
  @media (min-width: 768px) {
    .fs-download-banner { padding-inline: 32px; }
    .fs-download-banner__card { grid-template-columns: 44px minmax(0, 1fr) auto 32px; gap: 16px; }
    .fs-download-banner__actions { grid-column: 3; grid-row: 1; margin-top: 0; }
    .fs-download-banner__close { grid-column: 4; grid-row: 1; align-self: center; margin-top: 0; }
  }
  @media (min-width: 1280px) { .fs-download-banner { padding-inline: 40px; } }
`;

export default function AppDownloadBanner() {
  const [platform, setPlatform] = useState<ReturnType<typeof getDownloadPlatform>>("other");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setPlatform(getDownloadPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints, window.Telegram?.WebApp?.platform));
    const refresh = () => setVisible(!isDownloadBannerDismissed(readDismissal(), Date.now()));
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  const dismiss = () => {
    setVisible(false);
    const until = String(Date.now() + DOWNLOAD_BANNER_WEEK);
    for (const storageName of ["localStorage", "sessionStorage"] as const) {
      try { window[storageName].setItem(DOWNLOAD_BANNER_KEY, until); } catch { /* Closing must work without storage. */ }
    }
  };

  if (!visible) return null;

  return (
    <section className="fs-download-banner" aria-label="Скачать приложение FoodSave">
      <style>{styles}</style>
      <div className="fs-surface fs-download-banner__card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="fs-download-banner__icon" src="/brand/foodsave-app-icon.jpg" alt="" width={44} height={44} />
        <div>
          <h2 className="fs-download-banner__title">FoodSave</h2>
          <p className="fs-download-banner__text">Скачайте и спасайте еду с выгодой</p>
        </div>
        <button className="fs-download-banner__close" type="button" onClick={dismiss} aria-label="Скрыть баннер на неделю">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
        <div className="fs-download-banner__actions">
          {platform !== "android" && <a className="fs-download-banner__link" href={appStoreUrl} target="_blank" rel="noopener noreferrer" onClick={openStore} aria-label="Скачать FoodSave в App Store"><svg className="fs-download-banner__store-icon" viewBox="8 8 21 24" fill="currentColor" aria-hidden="true">
                <path d="M24.76888,20.30068a4.94881,4.94881,0,0,1,2.35656-4.15206,5.06566,5.06566,0,0,0-3.99116-2.15768c-1.67924-.17626-3.30719,1.00483-4.1629,1.00483-.87227,0-2.18977-.98733-3.6085-.95814a5.31529,5.31529,0,0,0-4.47292,2.72787c-1.934,3.34842-.49141,8.26947,1.3612,10.97608.9269,1.32535,2.01018,2.8058,3.42763,2.7533,1.38706-.05753,1.9051-.88448,3.5794-.88448,1.65876,0,2.14479.88448,3.591.8511,1.48838-.02416,2.42613-1.33124,3.32051-2.66914a10.962,10.962,0,0,0,1.51842-3.09251A4.78205,4.78205,0,0,1,24.76888,20.30068Z" />
                <path d="M22.03725,12.21089a4.87248,4.87248,0,0,0,1.11452-3.49062,4.95746,4.95746,0,0,0-3.20758,1.65961,4.63634,4.63634,0,0,0-1.14371,3.36139A4.09905,4.09905,0,0,0,22.03725,12.21089Z" />
              </svg><span>App Store</span></a>}
          {platform !== "ios" && <a className="fs-download-banner__link" href={googlePlayUrl} target="_blank" rel="noopener noreferrer" onClick={openStore} aria-label="Скачать FoodSave в Google Play"><svg className="fs-download-banner__store-icon" viewBox="0 0 24 26" fill="none" aria-hidden="true">
                <path d="M2 1.8 13.2 13 2 24.2a1.8 1.8 0 0 1-.5-1.3V3.1c0-.5.2-.9.5-1.3Z" fill="#4285F4" />
                <path d="m2 1.8 14.3 8.3-3.1 2.9L2 1.8Z" fill="#34A853" />
                <path d="m13.2 13 3.1-2.9 5.1 2.2q1.2.7 0 1.4l-5.1 2.2-3.1-2.9Z" fill="#FBBC04" />
                <path d="m2 24.2 11.2-11.2 3.1 2.9L2 24.2Z" fill="#EA4335" />
              </svg><span>Google Play</span></a>}
        </div>
      </div>
    </section>
  );
}
