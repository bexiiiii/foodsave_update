import { useEffect, useCallback } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        initData: string;
        initDataUnsafe: {
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
      };
    };
  }
}

// Global singleton to track initialization
let isInitialized = false;

export const useTelegram = () => {
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp && !isInitialized) {
      const tg = window.Telegram.WebApp;
      
      try {
        tg.ready();
        tg.expand();
        tg.setHeaderColor("#FFFFFF");
        tg.setBackgroundColor("#FFFFFF");
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

  return {
    isAvailable: typeof window !== "undefined" && !!window.Telegram?.WebApp,
    getTelegramUser,
    getTelegramInitData,
  };
};