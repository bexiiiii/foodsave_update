export type UserLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  updatedAt: string;
};

const STORAGE_KEY = "foodsaveLastLocation";
const LOCATION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const isValidCoordinate = (latitude: unknown, longitude: unknown) =>
  typeof latitude === "number"
  && Number.isFinite(latitude)
  && latitude >= -90
  && latitude <= 90
  && typeof longitude === "number"
  && Number.isFinite(longitude)
  && longitude >= -180
  && longitude <= 180;

export const isLocationFresh = (location: Pick<UserLocation, "updatedAt">) => {
  const updatedAt = Date.parse(location.updatedAt);
  return Number.isFinite(updatedAt)
    && updatedAt <= Date.now() + 60 * 1000
    && Date.now() - updatedAt <= LOCATION_MAX_AGE_MS;
};

export const readSavedLocation = (): UserLocation | null => {
  if (typeof window === "undefined") return null;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as Partial<UserLocation>;
    if (!isValidCoordinate(parsed.latitude, parsed.longitude) || !parsed.updatedAt) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    const location = {
      latitude: parsed.latitude as number,
      longitude: parsed.longitude as number,
      accuracyMeters: typeof parsed.accuracyMeters === "number" ? parsed.accuracyMeters : undefined,
      updatedAt: parsed.updatedAt,
    };

    if (!isLocationFresh(location)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return location;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const saveLocation = (location: UserLocation) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
};

const requestTelegramLocation = (): Promise<UserLocation | null> => {
  const locationManager = window.Telegram?.WebApp?.LocationManager;
  if (!locationManager) return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (location: UserLocation | null) => {
      if (settled) return;
      settled = true;
      resolve(location);
    };

    const timeoutId = window.setTimeout(() => finish(null), 12000);
    const getLocation = () => {
      if (!locationManager.isLocationAvailable) {
        window.clearTimeout(timeoutId);
        finish(null);
        return;
      }

      locationManager.getLocation((data) => {
        window.clearTimeout(timeoutId);
        if (!data || !isValidCoordinate(data.latitude, data.longitude)) {
          finish(null);
          return;
        }

        finish({
          latitude: data.latitude,
          longitude: data.longitude,
          accuracyMeters: data.horizontal_accuracy,
          updatedAt: new Date().toISOString(),
        });
      });
    };

    try {
      if (locationManager.isInited) getLocation();
      else locationManager.init(getLocation);
    } catch {
      window.clearTimeout(timeoutId);
      finish(null);
    }
  });
};

const requestBrowserLocation = (): Promise<UserLocation> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("LOCATION_UNAVAILABLE"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
        updatedAt: new Date().toISOString(),
      }),
      (error) => reject(new Error(error.code === error.PERMISSION_DENIED ? "LOCATION_DENIED" : "LOCATION_UNAVAILABLE")),
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 2 * 60 * 1000,
      },
    );
  });

export const requestCurrentLocation = async (): Promise<UserLocation> => {
  const telegramLocation = await requestTelegramLocation();
  if (telegramLocation) {
    saveLocation(telegramLocation);
    return telegramLocation;
  }

  const browserLocation = await requestBrowserLocation();
  saveLocation(browserLocation);
  return browserLocation;
};

export const openTelegramLocationSettings = () => {
  const locationManager = window.Telegram?.WebApp?.LocationManager;
  if (!locationManager?.openSettings) return false;

  try {
    locationManager.openSettings();
    return true;
  } catch {
    return false;
  }
};
