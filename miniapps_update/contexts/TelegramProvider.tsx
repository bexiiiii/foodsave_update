"use client";

import { createContext, useContext } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { RegistrationModal } from '../components/RegistrationModal';

const TelegramContext = createContext<any>(null);

export const TelegramProvider = ({ children }: { children: React.ReactNode }) => {
  const telegram = useTelegram();

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