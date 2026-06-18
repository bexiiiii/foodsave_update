import type { Metadata, Viewport } from 'next';
import { Inter, Unbounded } from 'next/font/google';

import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-unbounded',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FOODSAVE',
  description:
    'Сюрприз-боксы со скидкой 50–70% из кафе и магазинов рядом. Онлайн-оплата — забираете в день заказа.',
  keywords: [
    'foodsave',
    'маркетплейс еды',
    'сюрприз-боксы',
    'кафе',
    'магазины',
    'скидки',
    'еда рядом',
  ],
  openGraph: {
    title: 'FOODSAVE',
    description:
      'Маркетплейс еды, который сохраняет продукты и создаёт ценность.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#f9fff5',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} ${unbounded.variable}`}>
        {children}
      </body>
    </html>
  );
}
