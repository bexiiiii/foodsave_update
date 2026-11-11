"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiClient, Product, Store } from "../lib/api";
import { searchCatalog } from "../lib/catalogSearch";
import { subscribeToCatalogRefresh } from "../lib/catalogRefresh";
import { useTranslation } from "../hooks/useTranslation";

export default function HomeSearchResults({ query }: { query: string }) {
  const { t } = useTranslation();
  const [catalog, setCatalog] = useState<{ products: Product[]; stores: Store[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      try {
        const next = await apiClient.getSearchCatalog(controller.signal);
        if (!controller.signal.aborted) { setCatalog(next); setFailed(false); }
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally { pending = false; }
    };
    void load();
    const unsubscribe = subscribeToCatalogRefresh(load);
    return () => { controller.abort(); unsubscribe(); };
  }, [attempt]);
  const matches = useMemo(() => catalog && searchCatalog(query, catalog.products, catalog.stores), [query, catalog]);
  return (
    <section aria-label={t("search")} className="mt-2 space-y-2 rounded-xl border border-black/[0.07] bg-white p-3">
      {failed && <button type="button" className="p-2 text-sm" onClick={() => setAttempt(a => a + 1)}>{t("searchRetry")}</button>}
      {!failed && !matches && <p role="status" className="p-2 text-sm">{t("searchLoading")}</p>}
      {matches && [
        { label: t("searchBoxes"), items: matches.products.slice(0, 3).map(p => ({ id: p.id, name: p.name, detail: p.storeName, href: `/details/${p.id}` })) },
        { label: t("searchStores"), items: matches.stores.slice(0, 3).map(s => ({ id: s.id, name: s.name, detail: s.address, href: `/boxes?storeId=${s.id}` })) },
      ].filter(group => group.items.length).map(group => (
        <div key={group.label}>
          <h2 className="px-2 text-xs font-semibold text-black/55">{group.label}</h2>
          {group.items.map(item => (
            <Link key={item.id} href={item.href} className="block rounded-lg px-2 py-2 text-sm hover:bg-gray-50">
              <span className="block font-semibold">{item.name}</span>
              {item.detail && <span className="text-xs text-black/55">{item.detail}</span>}
            </Link>
          ))}
        </div>
      ))}
      {matches && !failed && !matches.products.length && !matches.stores.length && <p role="status" className="p-2 text-sm">{t("searchEmpty")}</p>}
      <Link href={`/markets?query=${encodeURIComponent(query)}`} className="block rounded-lg bg-[#EDF7F0] px-3 py-3 text-center text-sm font-semibold text-[#267348]">
        {t("searchWithFilters")}
      </Link>
    </section>
  );
}
