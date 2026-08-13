const minorUnitThreshold = 50_000;

export const normalizePrice = (value?: number | null) => {
  const price = Number(value || 0);
  if (!Number.isFinite(price)) return 0;

  return Math.abs(price) >= minorUnitThreshold ? price / 100 : price;
};

export const formatPrice = (value?: number | null) =>
  `${Math.round(normalizePrice(value)).toLocaleString("ru-RU")} ₸`;
