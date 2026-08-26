"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { ArrowLeft, Crosshair, LoaderCircle, Navigation } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "../../components/BottomNav";
import { apiClient, Store } from "../../lib/api";
import { openTelegramLocationSettings, readSavedLocation, requestCurrentLocation, UserLocation } from "../../lib/location";

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
  const userLocationLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const hasSetInitialViewportRef = useRef(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "denied" | "unavailable">("idle");

  useEffect(() => {
    const savedLocation = readSavedLocation();
    if (savedLocation) {
      setUserLocation(savedLocation);
      setLocationStatus("ready");
    }
  }, []);

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
      userLocationLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setIsMapReady(true);
    };

    initMap();

    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      userLocationLayerRef.current = null;
      setIsMapReady(false);
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

      if (hasSetInitialViewportRef.current || userLocation) return;

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
      hasSetInitialViewportRef.current = true;
    };

    updateMarkers();
  }, [isMapReady, router, stores, userLocation]);

  useEffect(() => {
    const updateUserMarker = async () => {
      if (!mapRef.current || !userLocationLayerRef.current || !userLocation) return;

      const L = await import("leaflet");
      const userLayer = userLocationLayerRef.current;
      userLayer.clearLayers();

      if (userLocation.accuracyMeters && userLocation.accuracyMeters > 0) {
        L.circle([userLocation.latitude, userLocation.longitude], {
          radius: Math.min(userLocation.accuracyMeters, 500),
          color: "#2563eb",
          fillColor: "#60a5fa",
          fillOpacity: 0.14,
          weight: 1,
          interactive: false,
        }).addTo(userLayer);
      }

      L.marker([userLocation.latitude, userLocation.longitude], {
        zIndexOffset: 1000,
        icon: L.divIcon({
          className: "",
          html: `<div class="foodsave-user-marker"><span class="foodsave-user-marker-pulse"></span><span class="foodsave-user-marker-dot"></span></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      }).bindTooltip("Вы здесь", {
        permanent: true,
        direction: "top",
        offset: [0, -14],
        className: "foodsave-user-tooltip",
      }).addTo(userLayer);

      mapRef.current.setView([userLocation.latitude, userLocation.longitude], 16, { animate: true });
      hasSetInitialViewportRef.current = true;
    };

    updateUserMarker();
  }, [isMapReady, userLocation]);

  const locateUser = async () => {
    if (locationStatus === "loading") return;
    setLocationStatus("loading");

    try {
      const nextLocation = await requestCurrentLocation();
      setUserLocation(nextLocation);
      setLocationStatus("ready");

      apiClient.updateMyLocation(
        nextLocation.latitude,
        nextLocation.longitude,
        nextLocation.accuracyMeters,
      ).catch(() => undefined);
    } catch (error) {
      setLocationStatus(error instanceof Error && error.message === "LOCATION_DENIED" ? "denied" : "unavailable");
    }
  };

  const handleLocationAction = () => {
    if (locationStatus === "denied" && openTelegramLocationSettings()) return;
    if (locationStatus === "ready" && userLocation && mapRef.current) {
      mapRef.current.setView([userLocation.latitude, userLocation.longitude], 16, { animate: true });
      return;
    }
    locateUser();
  };

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

          <button
            type="button"
            onClick={handleLocationAction}
            disabled={locationStatus === "loading"}
            aria-label="Показать мое местоположение"
            className="absolute bottom-5 right-5 z-[500] flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#15551f] shadow-[0_10px_30px_rgba(0,0,0,0.18)] active:scale-95 disabled:opacity-70"
          >
            {locationStatus === "loading" ? <LoaderCircle className="h-6 w-6 animate-spin" /> : <Crosshair className="h-6 w-6" />}
          </button>

          {locationStatus !== "idle" && locationStatus !== "loading" && (
            <div
              role="status"
              aria-live="polite"
              className="absolute bottom-5 left-5 z-[500] flex max-w-[calc(100%-100px)] items-center gap-2 rounded-2xl bg-white px-4 py-3 text-left text-xs font-bold text-black shadow-[0_10px_30px_rgba(0,0,0,0.16)]"
            >
              <Navigation className={`h-4 w-4 shrink-0 ${locationStatus === "ready" ? "text-blue-600" : "text-red-500"}`} />
              <span>
                {locationStatus === "ready" && "Вы на карте"}
                {locationStatus === "denied" && "Нет доступа к геолокации"}
                {locationStatus === "unavailable" && "Не удалось определить точку"}
              </span>
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

        .foodsave-user-marker {
          position: relative;
          width: 32px;
          height: 32px;
        }

        .foodsave-user-marker-pulse {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: rgba(37, 99, 235, 0.22);
          animation: foodsave-location-pulse 1.8s ease-out infinite;
        }

        .foodsave-user-marker-dot {
          position: absolute;
          inset: 7px;
          border: 3px solid white;
          border-radius: 9999px;
          background: #2563eb;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45);
        }

        .foodsave-user-tooltip {
          border: 0;
          border-radius: 9999px;
          padding: 6px 9px;
          color: #1d4ed8;
          font-size: 11px;
          font-weight: 800;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.14);
        }

        .foodsave-user-tooltip::before {
          display: none;
        }

        @keyframes foodsave-location-pulse {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(1.35); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
