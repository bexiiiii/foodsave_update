"use client";

import { createContext, useContext, useEffect } from 'react';
import { apiClient } from '../lib/api';
import { useTelegram } from '../hooks/useTelegram';
import { RegistrationModal } from '../components/RegistrationModal';

const TelegramContext = createContext<any>(null);

export const TelegramProvider = ({ children }: { children: React.ReactNode }) => {
  const telegram = useTelegram();

  useEffect(() => {
    const retryLanguageSync = () => { void apiClient.syncNotificationLanguage().catch(console.warn); };
    window.addEventListener('online', retryLanguageSync);
    return () => window.removeEventListener('online', retryLanguageSync);
  }, []);

  return (
    <TelegramContext.Provider value={telegram}>
      {children}
      <RegistrationModal />
    </TelegramContext.Provider>
  );
};

export const useTelegramContext = () => {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegramContext must be used within TelegramProvider');
  }
  return context;
};