import { useEffect, useCallback } from 'react';

type TelegramSafeAreaInset = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        version?: string;
        isVersionAtLeast?: (version: string) => boolean;
        requestFullscreen?: () => void;
        disableVerticalSwipes?: () => void;
        setBottomBarColor?: (color: string) => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        safeAreaInset?: TelegramSafeAreaInset;
        contentSafeAreaInset?: TelegramSafeAreaInset;
        onEvent?: (eventType: string, eventHandler: () => void) => void;
        initData: string;
        initDataUnsafe: {
          start_param?: string;
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        requestContact?: (callback: (
          isSuccess: boolean,
          response?: {
            responseUnsafe?: {
              contact?: {
                phone_number: string;
                first_name?: string;
                last_name?: string;
              };
            };
          }
        ) => void) => void;
        openTelegramLink?: (url: string) => void;
        LocationManager?: {
          isInited: boolean;
          isLocationAvailable: boolean;
          isAccessRequested: boolean;
          isAccessGranted: boolean;
          init: (callback?: () => void) => void;
          getLocation: (callback: (data: {
            latitude: number;
            longitude: number;
            horizontal_accuracy?: number;
          } | null) => void) => void;
          openSettings?: () => void;
        };
      };
    };
  }
}

// Global singleton to track initialization
let isInitialized = false;

const setSafeAreaVariables = (
  safeArea?: TelegramSafeAreaInset,
  contentSafeArea?: TelegramSafeAreaInset,
) => {
  const effective = contentSafeArea ?? safeArea;
  if (!effective) return;

  const root = document.documentElement;
  root.style.setProperty('--tg-safe-area-top', `${effective.top}px`);
  root.style.setProperty('--tg-safe-area-bottom', `${effective.bottom}px`);
  root.style.setProperty('--tg-safe-area-left', `${effective.left}px`);
  root.style.setProperty('--tg-safe-area-right', `${effective.right}px`);
};

const supportsTelegramVersion = (
  webApp: NonNullable<Window['Telegram']>['WebApp'],
  minimumVersion: string,
) => webApp.isVersionAtLeast?.(minimumVersion) ?? false;

export const useTelegram = () => {
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp && !isInitialized) {
      const tg = window.Telegram.WebApp;
      
      try {
        tg.ready();
        tg.setHeaderColor("#FFFFFF");
        tg.setBackgroundColor("#FFFFFF");
        tg.setBottomBarColor?.("#FFFFFF");
        tg.expand();

        if (supportsTelegramVersion(tg, '7.7')) {
          tg.disableVerticalSwipes?.();
        }

        if (supportsTelegramVersion(tg, '8.0')) {
          try {
            tg.requestFullscreen?.();
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.debug('Telegram fullscreen is unavailable:', error);
            }
          }
        }

        const syncSafeArea = () => setSafeAreaVariables(tg.safeAreaInset, tg.contentSafeAreaInset);
        syncSafeArea();
        tg.onEvent?.('safeAreaChanged', syncSafeArea);
        tg.onEvent?.('contentSafeAreaChanged', syncSafeArea);

        isInitialized = true;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Telegram WebApp initialized once');
        }
      } catch (error) {
        console.error('Failed to initialize Telegram WebApp:', error);
      }
    }
  }, []); // Empty dependency array ensures this runs only once

  const getTelegramUser = useCallback(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.initDataUnsafe?.user) {
      return window.Telegram.WebApp.initDataUnsafe.user;
    }
    return null;
  }, []);

  const getTelegramInitData = useCallback(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) {
      return window.Telegram.WebApp.initData;
    }
    return null;
  }, []);

  const getTelegramStartParam = useCallback(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.initDataUnsafe?.start_param) {
      return window.Telegram.WebApp.initDataUnsafe.start_param;
    }
    return null;
  }, []);

  return {
    isAvailable: typeof window !== "undefined" && !!window.Telegram?.WebApp,
    getTelegramUser,
    getTelegramInitData,
    getTelegramStartParam,
  };
};
