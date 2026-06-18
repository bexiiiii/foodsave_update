import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { TelegramProvider } from "../contexts/TelegramProvider";
import { ErrorBoundary } from "../components/ErrorBoundary";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "FoodSave - Экономь на еде",
  description: "Telegram Mini App для экономии на еде",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-VRYCY4H7NW"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-VRYCY4H7NW');
          `}
        </Script>
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-[#F5F5F5]`}
        style={{ fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}
      >
        <ErrorBoundary>
          <TelegramProvider>
            {children}
          </TelegramProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
