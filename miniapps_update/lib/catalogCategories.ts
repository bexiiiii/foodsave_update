type CatalogCategory = { id: number | string; name: string };

const strawberryNames = new Set([
  'клубника', 'клубника в шоколаде', 'strawberry', 'strawberries',
  'strawberry in chocolate', 'strawberries in chocolate', 'құлпынай', 'шоколадтағы құлпынай',
]);

export const isStrawberryCategory = (name: string) =>
  strawberryNames.has(name.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' '));

// Keep every backend ID: this is a navigation group, not a data merge.
export function groupCatalogCategories<T extends CatalogCategory>(categories: T[]) {
  const groups: Array<T & { categoryIds: string[] }> = [];
  for (const category of categories) {
    const existing = groups.find(group =>
      String(group.id) === String(category.id)
      || (isStrawberryCategory(group.name) && isStrawberryCategory(category.name)),
    );
    if (existing) {
      if (!existing.categoryIds.includes(String(category.id))) existing.categoryIds.push(String(category.id));
    } else {
      groups.push({ ...category, categoryIds: [String(category.id)] });
    }
  }
  return groups;
}

export const matchesCatalogCategory = (filter: string, categoryId?: number | string) =>
  !filter || filter.split(',').map(id => id.trim()).includes(String(categoryId));

// A grouped link must also remain represented in the category selector,
// even when only one of its categories currently has available products.
export function includeSelectedCategoryGroup(
  options: Array<[string, string]>, selected: string, strawberryLabel: string,
): Array<[string, string]> {
  if (!selected.includes(',') || options.some(([id]) => id === selected)) return options;
  const names = options.filter(([id]) => matchesCatalogCategory(selected, id)).map(([, name]) => name);
  if (!names.length) return options;
  const label = names.every(isStrawberryCategory) ? strawberryLabel : [...new Set(names)].join(' / ');
  return [[selected, label], ...options];
}
