import type { Product, Store } from "./api";

const wordPattern = new RegExp("[\\p{L}\\p{N}]+", "gu");
const words = (text: string) =>
  text.normalize("NFKC").toLowerCase().replace(/ё/g, "е").match(wordPattern) ?? [];

// One insertion, deletion, substitution or swap of adjacent letters in a word.
function withinOneEdit(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length !== b.length) {
    return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
  }
  return a.slice(i + 1) === b.slice(i + 1) ||
    (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
}

function matchItems<T>(items: T[], terms: string[], fields: (item: T) => (string | undefined)[]) {
  const exact: T[] = [];
  const close: T[] = [];
  for (const item of items) {
    const tokens = words(fields(item).join(" "));
    const unmatched = terms.filter(term => !tokens.some(token => token.includes(term)));
    if (!unmatched.length) exact.push(item);
    else if (unmatched.every(term => term.length >= 4 && tokens.some(token =>
      [term.length - 1, term.length, term.length + 1].some(length =>
        withinOneEdit(term, token.slice(0, length))
      )
    ))) close.push(item);
  }
  return [...exact, ...close];
}

export function searchCatalog(query: string, products: Product[], stores: Store[]) {
  if (!query.trim()) return { products, stores };
  const terms = words(query);
  if (!terms.length) return { products: [], stores: [] };
  return {
    products: matchItems(products, terms, p => [p.name, p.description, p.storeName, p.categoryName]),
    stores: matchItems(stores, terms, s => [s.name, s.address, s.category, s.description]),
  };
}
