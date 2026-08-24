"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "../../components/BottomNav";
import { apiClient, Store } from "../../lib/api";

const astanaCenter: Leaflet.LatLngTuple = [51.1694, 71.4491];

const getStoresWithLocation = (stores: Store[]) =>
  stores.filter((store) => typeof store.latitude === "number" && typeof store.longitude === "number");

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export default function MapPage() {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markersLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    apiClient
      .getActiveStores()
      .then((items) => {
        if (mounted) setStores(items);
      })
      .catch((error) => console.error("Failed to load stores for map:", error))
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (document.getElementById("leaflet-css")) return;

    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      if (!mapContainerRef.current || mapRef.current) return;

      const L = await import("leaflet");
      if (!mounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: astanaCenter,
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    };

    initMap();

    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const updateMarkers = async () => {
      if (!mapRef.current || !markersLayerRef.current) return;

      const L = await import("leaflet");
      const storesWithLocation = getStoresWithLocation(stores);
      const markersLayer = markersLayerRef.current;

      markersLayer.clearLayers();

      storesWithLocation.forEach((store) => {
        const marker = L.marker([store.latitude as number, store.longitude as number], {
          icon: L.divIcon({
            className: "",
            html: `
              <div class="foodsave-map-marker">
                <span class="foodsave-map-marker-dot"></span>
                <span class="foodsave-map-marker-label">${escapeHtml(store.name)}</span>
              </div>
            `,
            iconSize: [150, 40],
            iconAnchor: [16, 36],
          }),
        });

        marker.on("click", () => router.push(`/boxes?storeId=${store.id}`));
        marker.addTo(markersLayer);
      });

      if (storesWithLocation.length === 1) {
        mapRef.current.setView([storesWithLocation[0].latitude as number, storesWithLocation[0].longitude as number], 15);
      } else if (storesWithLocation.length > 1) {
        const bounds = L.latLngBounds(
          storesWithLocation.map((store) => [store.latitude as number, store.longitude as number] as Leaflet.LatLngTuple),
        );
        mapRef.current.fitBounds(bounds, { padding: [34, 34], maxZoom: 15 });
      } else {
        mapRef.current.setView(astanaCenter, 12);
      }
    };

    updateMarkers();
  }, [router, stores]);

  return (
    <div className="min-h-screen bg-white pb-24" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <header className="px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center active:scale-95 transition-all duration-300">
            <ArrowLeft className="w-5 h-5 text-gray-800" />
          </Link>
          <h1 className="text-xl font-bold text-black font-inter">Карта</h1>
        </div>
      </header>

      <main className="px-4 pt-4">
        <div className="relative h-[calc(100vh-170px)] min-h-[520px] overflow-hidden rounded-3xl border border-gray-100 bg-gray-100">
          <div ref={mapContainerRef} className="h-full w-full" />

          {isLoading && (
            <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/95 p-4 text-center text-sm font-semibold text-black/65 shadow-lg backdrop-blur font-inter">
              Загружаем заведения...
            </div>
          )}
        </div>
      </main>

      <BottomNav active="markets" />

      <style jsx global>{`
        .leaflet-container {
          height: 100%;
          width: 100%;
          font-family: Inter, system-ui, sans-serif;
        }

        .foodsave-map-marker {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          max-width: 150px;
          cursor: pointer;
          transform: translateY(-2px);
        }

        .foodsave-map-marker-dot {
          width: 16px;
          height: 16px;
          flex: 0 0 16px;
          border-radius: 9999px;
          background: #e5484d;
          box-shadow: 0 0 0 4px rgba(229, 72, 77, 0.18), 0 10px 24px rgba(0, 0, 0, 0.22);
        }

        .foodsave-map-marker-label {
          max-width: 118px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          border-radius: 9999px;
          background: white;
          padding: 7px 10px;
          color: #15551f;
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
        }
      `}</style>
    </div>
  );
}
