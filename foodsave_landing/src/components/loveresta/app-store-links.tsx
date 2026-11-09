import styles from './app-store-links.module.css';

const stores = [
  {
    name: 'App Store',
    href: 'https://apps.apple.com/kz/app/foodsave/id6809133516',
  },
  {
    name: 'Google Play',
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
            {store.name === "App Store" ? (
              <svg className={styles.icon} viewBox="8 8 21 24" fill="currentColor" aria-hidden="true">
                <path d="M24.76888,20.30068a4.94881,4.94881,0,0,1,2.35656-4.15206,5.06566,5.06566,0,0,0-3.99116-2.15768c-1.67924-.17626-3.30719,1.00483-4.1629,1.00483-.87227,0-2.18977-.98733-3.6085-.95814a5.31529,5.31529,0,0,0-4.47292,2.72787c-1.934,3.34842-.49141,8.26947,1.3612,10.97608.9269,1.32535,2.01018,2.8058,3.42763,2.7533,1.38706-.05753,1.9051-.88448,3.5794-.88448,1.65876,0,2.14479.88448,3.591.8511,1.48838-.02416,2.42613-1.33124,3.32051-2.66914a10.962,10.962,0,0,0,1.51842-3.09251A4.78205,4.78205,0,0,1,24.76888,20.30068Z" />
                <path d="M22.03725,12.21089a4.87248,4.87248,0,0,0,1.11452-3.49062,4.95746,4.95746,0,0,0-3.20758,1.65961,4.63634,4.63634,0,0,0-1.14371,3.36139A4.09905,4.09905,0,0,0,22.03725,12.21089Z" />
              </svg>
            ) : (
              <svg className={styles.icon} viewBox="0 0 24 26" fill="none" aria-hidden="true">
                <path d="M2 1.8 13.2 13 2 24.2a1.8 1.8 0 0 1-.5-1.3V3.1c0-.5.2-.9.5-1.3Z" fill="#4285F4" />
                <path d="m2 1.8 14.3 8.3-3.1 2.9L2 1.8Z" fill="#34A853" />
                <path d="m13.2 13 3.1-2.9 5.1 2.2q1.2.7 0 1.4l-5.1 2.2-3.1-2.9Z" fill="#FBBC04" />
                <path d="m2 24.2 11.2-11.2 3.1 2.9L2 24.2Z" fill="#EA4335" />
              </svg>
            )}
            <span className={styles.name}>{store.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
