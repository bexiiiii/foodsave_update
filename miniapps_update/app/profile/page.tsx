"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { requestCurrentLocation } from "../../lib/location";
import { Check, ChevronRight, Loader2, User } from "lucide-react";
import Link from "next/link";
import BackButton from "../../components/BackButton";
import BottomNav from "../../components/BottomNav";
import AppStoreLinks from "../../components/AppStoreLinks";
import { useAuth } from "../../hooks/useAuth";
import { useTelegram } from "../../hooks/useTelegram";
import { apiClient, NotificationSettings } from "../../lib/api";

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [alertError, setAlertError] = useState("");
  const { } = useTelegram(); // Initialize Telegram singleton
  const [name, setName] = useState("");
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(user?.firstName || "");
    let active = true;
    setSettings(null);
    if (user) apiClient.getNotificationSettings().then(value => { if (active) setSettings(value); })
      .catch(() => { if (active) setAlertError(t("nearbySaveError")); });
    return () => { active = false; };
  }, [user]);

  const saveProfile = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await apiClient.updateProfile({ firstName: name.trim() });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  };

  const toggleAlerts = async (key: "promotions" | "nearbyOnly") => {
    if (!settings || savingAlerts) return;
    setSavingAlerts(true);
    setAlertError("");
    try {
      if (key === "nearbyOnly" && !settings.nearbyOnly) {
        const location = await requestCurrentLocation();
        if ((location.accuracyMeters ?? 0) > 500) throw new Error("LOCATION_UNAVAILABLE");
        await apiClient.updateMyLocation(location.latitude, location.longitude, location.accuracyMeters);
      }
      setSettings(await apiClient.updateNotificationSettings({ ...settings, [key]: !settings[key] }));
    } catch (error) {
      setAlertError(t(error instanceof Error && error.message.startsWith("LOCATION_")
        ? "nearbyLocationError" : "nearbySaveError"));
    } finally {
      setSavingAlerts(false);
    }
  };

  const getDisplayName = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('User data in profile:', user);
    }
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    if (user?.telegramUsername) {
      return user.telegramUsername;
    }
    return user?.username || "Пользователь";
  };

  const getUsername = () => {
    if (user?.telegramUsername) {
      return `@${user.telegramUsername}`;
    }
    if (user?.username) {
      return `@${user.username}`;
    }
    return "";
  };

  return (
    <div className="fs-page-reading min-h-screen bg-white pb-20" style={{ fontFamily: 'Inter, system-ui, sans-serif', paddingBottom: 'calc(104px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-xl font-bold text-black font-inter">Профиль</h1>
        </div>
      </div>

      {/* Profile Avatar & Info */}
      <div className="flex flex-col items-center mt-8">
        <div className="w-20 h-20 bg-[#4CAD73] rounded-full flex items-center justify-center overflow-hidden">
          {user?.telegramPhotoUrl ? (
            <img 
              src={user.telegramPhotoUrl}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <User className="w-10 h-10 text-white" strokeWidth={2} />
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-black mt-6 font-inter">{getDisplayName()}</h2>
        {getUsername() && (
          <p className="text-sm font-medium text-black/50 mt-1 font-inter">{getUsername()}</p>
        )}
        {user?.email && !user.email.includes('@telegram.local') && (
          <p className="text-sm font-medium text-black/50 mt-1 font-inter">{user.email}</p>
        )}
      </div>

      {/* Menu Items */}
      <div className="px-4 mt-12">
        <div className="fs-surface mb-4 rounded-2xl p-4">
          <label className="mb-2 block text-sm font-semibold text-black font-inter" htmlFor="profile-name">Имя</label>
          <input
            id="profile-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="fs-field w-full rounded-xl px-4 py-3 text-base text-black outline-none transition"
            autoComplete="given-name"
          />
          <button
            type="button"
            onClick={saveProfile}
            disabled={saving || !name.trim()}
            className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-[#4CAD73] text-sm font-bold text-white transition active:scale-[0.99] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <><Check className="mr-2 h-4 w-4" />Сохранено</> : "Сохранить"}
          </button>
        </div>
        <div className="fs-surface rounded-2xl overflow-hidden">
          <Link
            href="/language"
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.setItem("languageReturnTo", `${window.location.pathname}${window.location.search}`);
              }
            }}
            className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4 transition-colors active:bg-[#F7FAF8]"
          >
            <span className="text-base font-medium text-black font-inter">Язык</span>
            <ChevronRight className="w-5 h-5 text-black" />
          </Link>
          
          <button 
            onClick={() => {
              // Открываем Telegram аккаунт поддержки
              window.open('https://t.me/FoodSave_kz', '_blank');
            }}
            className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors active:bg-[#F7FAF8]"
          >
            <span className="text-base font-medium text-black font-inter">Поддержка</span>
            <ChevronRight className="w-5 h-5 text-black" />
          </button>
          <a
            href="https://partner.foodsave.kz/register"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              const telegram = window.Telegram?.WebApp;
              if (telegram?.openLink) {
                try {
                  telegram.openLink(event.currentTarget.href);
                  event.preventDefault();
                } catch {
                  // Keep the normal browser link as a fallback.
                }
              }
            }}
            className="flex w-full items-center justify-between border-t border-black/[0.06] px-5 py-4 text-left transition-colors active:bg-[#F7FAF8]"
          >
            <span className="text-base font-medium text-black font-inter">Стать партнёром</span>
            <ChevronRight className="w-5 h-5 text-black" />
          </a>
          <button type="button" role="switch" aria-checked={!!settings?.promotions} disabled={!settings || savingAlerts} onClick={() => void toggleAlerts("promotions")} className="flex w-full items-center justify-between border-t border-black/[0.06] px-5 py-4 text-left active:bg-[#F7FAF8]">
            <span className="text-base font-medium text-black font-inter">Уведомления о новых боксах</span>
            <span className={`h-6 w-11 rounded-full p-1 transition-colors ${settings?.promotions ? "bg-[#4CAD73]" : "bg-gray-300"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${settings?.promotions ? "translate-x-5" : "translate-x-0"}`} />
            </span>
          </button>
          {settings?.promotions && typeof settings.nearbyOnly === "boolean" && (
            <button type="button" role="switch" aria-checked={settings.nearbyOnly}
              disabled={savingAlerts} onClick={() => void toggleAlerts("nearbyOnly")}
              className="flex w-full items-center justify-between gap-4 border-t border-black/[0.06] px-5 py-4 text-left active:bg-[#F7FAF8]">
              <span>
                <span className="block text-base font-medium text-black">{t("nearbyAlerts")}</span>
                <span className="mt-1 block text-sm leading-5 text-black/60">{t("nearbyAlertsHint")}</span>
              </span>
              <span aria-hidden="true" className={`h-6 w-11 shrink-0 rounded-full p-1 transition-colors ${settings.nearbyOnly ? "bg-[#4CAD73]" : "bg-gray-300"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${settings.nearbyOnly ? "translate-x-5" : "translate-x-0"}`} />
              </span>
            </button>
          )}
          {alertError && <p role="alert" className="px-5 pb-4 text-sm text-[#853b34]">{alertError}</p>}
        </div>
        <AppStoreLinks />
        <section aria-label="Поддержка проекта" style={{ maxWidth: 280, margin: '40px auto 0', textAlign: 'center' }}>
          <img
            src="/nu-impact-foundation.png"
            alt="NU Impact Foundation"
            style={{ display: 'block', width: 140, height: 'auto', margin: '0 auto' }}
          />
          <p style={{ margin: '12px auto 0', maxWidth: 240, fontSize: 12, lineHeight: '18px', color: '#747b76' }}>
            Проект реализуется при поддержке<br />NU Impact Foundation
          </p>
        </section>
      </div>
      <BottomNav active="profile" />
    </div>
  );
}
