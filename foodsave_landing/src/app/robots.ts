import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/checkout/',
          '/orders/',
          '/profile/',
          '/register/',
          '/reset-password/',
          '/order/',
        ],
      },
      // Allow Googlebot full access
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/checkout/',
          '/orders/',
          '/profile/',
          '/register/',
          '/reset-password/',
        ],
      },
      // Allow Yandex
      {
        userAgent: 'YandexBot',
        allow: '/',
        disallow: [
          '/api/',
          '/checkout/',
          '/orders/',
          '/profile/',
          '/register/',
          '/reset-password/',
        ],
      },
    ],
    sitemap: 'https://foodsave.kz/sitemap.xml',
    host: 'https://foodsave.kz',
  };
}
