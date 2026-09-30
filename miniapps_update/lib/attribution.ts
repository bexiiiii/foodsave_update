export const ATTRIBUTION_KEY = "foodsaveAttribution";
export const HANDLED_START_PARAM_KEY = "foodsaveHandledStartParam";
export const ATTRIBUTION_TTL_MS = 24 * 60 * 60 * 1000;

export type FoodSaveAttribution = Record<string, unknown> & {
  startParam?: string;
  capturedAt?: number;
};

export const parseStoredAttribution = (
  raw: string | null,
  now = Date.now(),
): FoodSaveAttribution | null => {
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as FoodSaveAttribution;
    if (!Number.isFinite(value.capturedAt)) return null;
    if (value.capturedAt! > now || now - value.capturedAt! > ATTRIBUTION_TTL_MS) return null;
    return value;
  } catch {
    return null;
  }
};

export const readAttribution = (now = Date.now()): FoodSaveAttribution => {
  if (typeof window === "undefined") return {};

  const attribution = parseStoredAttribution(sessionStorage.getItem(ATTRIBUTION_KEY), now);
  if (attribution) return attribution;

  sessionStorage.removeItem(ATTRIBUTION_KEY);
  sessionStorage.removeItem(HANDLED_START_PARAM_KEY);
  return {};
};

export const saveAttribution = (attribution: FoodSaveAttribution, now = Date.now()) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({ ...attribution, capturedAt: now }));
};
