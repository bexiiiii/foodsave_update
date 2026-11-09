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
  .fs-download-banner__card { display: grid; grid-template-columns: 44px minmax(0, 1fr) 32px; gap: 12px; align-items: center; padding: 16px; border: 1px solid #dcebe1; border-radius: 20px; background: #f0f7f2; }
  .fs-download-banner__icon { display: block; width: 44px; height: 44px; border: 1px solid #e3eae5; border-radius: 12px; }
  .fs-download-banner__title { margin: 0; color: #1e3929; font-size: 15px; line-height: 20px; font-weight: 600; }
  .fs-download-banner__text { margin: 4px 0 0; color: #5c7063; font-size: 12px; line-height: 17px; }
  .fs-download-banner__close { display: flex; justify-content: center; align-items: center; align-self: start; width: 44px; height: 44px; margin: -6px -6px 0; padding: 0; border: 0; border-radius: 50%; background: transparent; color: #64766a; cursor: pointer; }
  .fs-download-banner__actions { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; }
  .fs-download-banner__link { display: flex; justify-content: center; align-items: center; flex: 1; min-height: 42px; padding: 8px 14px; box-sizing: border-box; border-radius: 12px; background: #4cad73; color: #fff; text-decoration: none; font-size: 13px; line-height: 18px; font-weight: 600; white-space: nowrap; }
  .fs-download-banner__close:focus-visible, .fs-download-banner__link:focus-visible { outline: 2px solid #214f35; outline-offset: 3px; }
  .fs-download-banner__close:active { background: #dfece3; }
  .fs-download-banner__link:active { background: #38965e; }
  @media (min-width: 768px) {
    .fs-download-banner { padding-inline: 32px; }
    .fs-download-banner__card { grid-template-columns: 44px minmax(0, 1fr) auto 32px; gap: 16px; }
    .fs-download-banner__actions { grid-column: 3; grid-row: 1; }
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
      <div className="fs-download-banner__card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="fs-download-banner__icon" src="/brand/foodsave-app-icon.jpg" alt="" width={44} height={44} />
        <div>
          <h2 className="fs-download-banner__title">FoodSave теперь в приложении</h2>
          <p className="fs-download-banner__text">Скачайте и спасайте еду с выгодой</p>
        </div>
        <button className="fs-download-banner__close" type="button" onClick={dismiss} aria-label="Скрыть баннер на неделю">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
        <div className="fs-download-banner__actions">
          {platform !== "android" && <a className="fs-download-banner__link" href={appStoreUrl} target="_blank" rel="noopener noreferrer" onClick={openStore} aria-label="Скачать FoodSave в App Store">{platform === "ios" ? "Скачать" : "App Store"}</a>}
          {platform !== "ios" && <a className="fs-download-banner__link" href={googlePlayUrl} target="_blank" rel="noopener noreferrer" onClick={openStore} aria-label="Скачать FoodSave в Google Play">{platform === "android" ? "Скачать" : "Google Play"}</a>}
        </div>
      </div>
    </section>
  );
}
