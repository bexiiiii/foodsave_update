"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, User } from '../lib/api';

// FoodSave logo symbol (just the icon, cropped from logo.svg viewBox)
function FoodSaveLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 140 133"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M 11.999 7.728 C 9.886 10.414, 9.859 10.962, 10.198 43.478 L 10.542 76.500 13.309 84.383 C 16.316 92.953, 22.565 103.186, 28.647 109.500 C 36.534 117.688, 43.831 121.929, 57 125.976 C 62.954 127.806, 66.369 127.975, 97.628 127.987 C 136.935 128.002, 135.087 128.437, 133.115 119.625 C 130.874 109.608, 116.445 84.989, 113.781 86.635 C 113.169 87.014, 112.974 86.850, 113.338 86.262 C 114.077 85.066, 103.380 74.734, 96.503 70.002 C 90.482 65.860, 77.058 59.162, 73.250 58.400 C 70.870 57.924, 69.928 58.265, 68.674 60.055 C 66.430 63.259, 67.916 65.357, 74.598 68.416 C 87.119 74.149, 101.657 85.737, 110.798 97.271 C 115.825 103.615, 121.261 112.689, 122.467 116.750 L 123.135 119 93.749 119 C 61.579 119, 59.291 118.691, 47.500 112.754 C 40.032 108.994, 29.476 98.391, 25.802 90.958 C 20.500 80.235, 20 76.166, 20 43.750 L 20 13.921 48.181 14.048 C 72.265 14.156, 77.438 14.450, 83.756 16.065 C 94.192 18.735, 100.427 22.373, 108.632 30.584 C 119.883 41.842, 123.678 51.542, 124.567 71.320 C 125.138 84.022, 126.095 86.055, 130.734 84.427 C 133.488 83.460, 133.501 83.411, 133.810 72.978 C 134.441 51.670, 128.452 36.801, 112.976 21.250 C 109.555 17.812, 106.173 15, 105.461 15 C 104.749 15, 104.017 14.663, 103.833 14.250 C 103.353 13.169, 92.287 8.004, 87 6.393 C 83.567 5.347, 74.398 5.019, 48.323 5.011 L 14.145 5 11.999 7.728"
        fill="#04452b"
        fillRule="evenodd"
      />
      <path
        d="M 30.750 24.582 C 29.738 25.596, 29.786 76, 30.799 76 C 31.239 76, 31.412 77.598, 31.184 79.552 C 30.339 86.792, 36.163 101.047, 42.779 107.928 C 51.736 117.245, 59.946 118.960, 95.714 118.983 L 122.929 119 121.010 114.523 C 113.956 98.068, 94.106 78.417, 75.496 69.466 C 66.456 65.118, 64.539 61.658, 69.405 58.470 C 71.649 57, 72.233 57.071, 78.155 59.548 C 102.411 69.691, 123.680 90.978, 131.506 112.945 C 132.630 116.099, 132.789 114.660, 132.914 100.200 C 133.055 83.945, 133.049 83.903, 130.960 85.021 C 129.319 85.900, 128.340 85.797, 126.433 84.548 C 124.126 83.037, 124 82.439, 124 73.039 C 124 57.905, 121.123 47.503, 114.265 37.836 C 110.628 32.711, 107.358 30.461, 98.427 26.939 C 92.767 24.708, 91.127 24.585, 62 24.217 C 45.225 24.004, 31.163 24.169, 30.750 24.582"
        fill="#a6da37"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function RegistrationModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showManualPhone, setShowManualPhone] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const firstNameRef = useRef(firstName);
  const lastNameRef = useRef(lastName);
  const currentUserRef = useRef(currentUser);
  useEffect(() => { firstNameRef.current = firstName; }, [firstName]);
  useEffect(() => { lastNameRef.current = lastName; }, [lastName]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // Poll for auth token then check if onboarding is needed
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    let attempts = 0;

    const checkOnboarding = async () => {
      if (cancelled) return;
      const token = localStorage.getItem('authToken');
      if (!token) {
        attempts++;
        if (attempts < 50) {
          setTimeout(checkOnboarding, 200);
        }
        return;
      }

      try {
        const user = await apiClient.getCurrentUser();
        if (cancelled) return;

        const key = `onboarding_done_${user.id}`;
        if (localStorage.getItem(key)) return;

        if (user.firstName && (user.phone || user.phoneNumber)) {
          localStorage.setItem(key, '1');
          return;
        }

        // Do NOT pre-fill fields — start blank
        setCurrentUser(user);
        setVisible(true);
      } catch {
        // Not authenticated yet
      }
    };

    const timer = setTimeout(checkOnboarding, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const markDone = useCallback(() => {
    const user = currentUserRef.current;
    if (user && typeof window !== 'undefined') {
      localStorage.setItem(`onboarding_done_${user.id}`, '1');
    }
    setVisible(false);
  }, []);

  const saveProfile = useCallback(async (phoneNumber?: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await apiClient.updateProfile({
        firstName: firstNameRef.current.trim(),
        lastName: lastNameRef.current.trim() || undefined,
        phone: phoneNumber || undefined,
      });
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSaving(false);
      markDone();
    }
  }, [isSaving, markDone]);

  const handleStep1Next = () => {
    if (!firstName.trim()) return;
    setStep(2);
  };

  const handleTelegramPhone = useCallback(() => {
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    if (!tg?.requestContact) {
      setShowManualPhone(true);
      return;
    }
    tg.requestContact((isSuccess, response) => {
      if (isSuccess && response?.responseUnsafe?.contact?.phone_number) {
        let num = response.responseUnsafe.contact.phone_number;
        if (!num.startsWith('+')) num = '+' + num;
        saveProfile(num);
      } else {
        // User denied — fall back to manual input (still mandatory)
        setShowManualPhone(true);
      }
    });
  }, [saveProfile]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-white flex flex-col"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Step progress dots */}
      <div className="flex justify-center gap-2 pt-12 pb-2">
        <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 1 ? 'w-6 bg-[#73be61]' : 'w-3 bg-[#73be61]/40'}`} />
        <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 2 ? 'w-6 bg-[#73be61]' : 'w-3 bg-[#73be61]/40'}`} />
      </div>

      {/* ─── STEP 1: Name ─── */}
      {step === 1 && (
        <div className="flex flex-col flex-1 px-6 pt-8">
          {/* FoodSave logo icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center bg-white">
              <FoodSaveLogo className="w-20 h-20" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-black text-center mb-2 font-inter">
            Добро пожаловать!
          </h1>
          <p className="text-sm text-black/50 text-center mb-8 font-inter">
            Заполните данные для оформления заказов
          </p>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Имя"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStep1Next()}
              className="w-full h-14 px-5 bg-gray-100 rounded-2xl text-base font-inter text-black placeholder-black/30 outline-none focus:bg-gray-200 transition-colors"
              autoComplete="given-name"
            />
            <input
              type="text"
              placeholder="Фамилия (необязательно)"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStep1Next()}
              className="w-full h-14 px-5 bg-gray-100 rounded-2xl text-base font-inter text-black placeholder-black/30 outline-none focus:bg-gray-200 transition-colors"
              autoComplete="family-name"
            />
          </div>

          <div className="mt-auto pb-8 pt-6">
            <button
              onClick={handleStep1Next}
              disabled={!firstName.trim()}
              className="w-full h-14 bg-[#73be61] disabled:bg-gray-200 disabled:text-gray-400 text-white text-base font-semibold font-inter rounded-2xl transition-all active:scale-95 shadow-sm"
            >
              Далее
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 2: Phone (mandatory) ─── */}
      {step === 2 && (
        <div className="flex flex-col flex-1 px-6 pt-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-[#73be61]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-black text-center mb-2 font-inter">
            Ваш номер телефона
          </h1>
          <p className="text-sm text-black/50 text-center mb-8 font-inter">
            Нужен для связи при получении заказа
          </p>

          {!showManualPhone ? (
            <div className="space-y-3">
              {/* Telegram share button */}
              <button
                onClick={handleTelegramPhone}
                disabled={isSaving}
                className="w-full h-14 bg-[#2AABEE] text-white text-base font-semibold font-inter rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm disabled:opacity-60"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.05 9.66c-.15.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.13.913.561z" />
                </svg>
                Поделиться через Telegram
              </button>

              <button
                onClick={() => setShowManualPhone(true)}
                className="w-full h-12 bg-gray-100 text-black/60 text-sm font-inter rounded-2xl active:scale-95 transition-all"
              >
                Ввести вручную
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="tel"
                placeholder="+7 (___) ___-__-__"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && phone.trim() && saveProfile(phone.trim())}
                className="w-full h-14 px-5 bg-gray-100 rounded-2xl text-base font-inter text-black placeholder-black/30 outline-none focus:bg-gray-200 transition-colors"
                autoFocus
                autoComplete="tel"
              />
              <button
                onClick={() => saveProfile(phone.trim() || undefined)}
                disabled={!phone.trim() || isSaving}
                className="w-full h-14 bg-[#73be61] disabled:bg-gray-200 disabled:text-gray-400 text-white text-base font-semibold font-inter rounded-2xl transition-all active:scale-95 shadow-sm"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
