import type { MetadataRoute } from 'next';
import { fetchStores } from '@/lib/api';

const siteUrl = 'https://foodsave.kz';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stores = await fetchStores();

  const storeUrls: MetadataRoute.Sitemap = stores.map((store) => ({
    url: `${siteUrl}/restaurant/${store.id}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/forUsers`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/forbussines`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    ...storeUrls,
  ];
}
