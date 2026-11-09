import { Download } from 'lucide-react';
import styles from './app-store-links.module.css';

const stores = [
  {
    name: 'App Store',
    platform: 'Для iPhone и iPad',
    href: 'https://apps.apple.com/kz/app/foodsave/id6809133516',
  },
  {
    name: 'Google Play',
    platform: 'Для Android',
    href: 'https://play.google.com/store/apps/details?id=com.foodsave.kz',
  },
];

export function AppStoreLinks({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`${styles.downloads}${dark ? ` ${styles.dark}` : ''}`}>
      <div className={styles.title}>Скачайте приложение FoodSave</div>
      <div className={styles.links}>
        {stores.map((store) => (
          <a
            key={store.name}
            className={styles.link}
            href={store.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Скачать FoodSave в ${store.name}`}
          >
            <Download size={23} strokeWidth={1.8} aria-hidden="true" />
            <span className={styles.copy}>
              <span className={styles.platform}>{store.platform}</span>
              <span className={styles.name}>{store.name}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
