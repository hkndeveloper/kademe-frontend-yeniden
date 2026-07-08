"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Loader2, LocateFixed, Navigation } from "lucide-react";
import type { Circle, DivIcon, LatLngExpression, LeafletMouseEvent, Map as LeafletMap, Marker } from "leaflet";

type MapMode = "picker" | "preview";
type LocationStatus = "idle" | "loading" | "success" | "error";
type LeafletModule = typeof import("leaflet") & { default?: typeof import("leaflet") };
type MapLibreModule = typeof import("maplibre-gl") & { default?: typeof import("maplibre-gl") };
type LeafletWithMapLibre = typeof import("leaflet") & {
  maplibreGL: (options: { style: string; attributionControl?: boolean }) => { addTo: (map: LeafletMap) => unknown };
};
type MapGlobals = Window & { L?: typeof import("leaflet"); maplibregl?: MapLibreModule | NonNullable<MapLibreModule["default"]> };

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

interface ProgramLocationMapProps {
  latitude?: number | string | null;
  longitude?: number | string | null;
  radiusMeters?: number | string | null;
  mode?: MapMode;
  heightClassName?: string;
  onChange?: (coordinates: MapCoordinates) => void;
}

const TURKEY_CENTER: LatLngExpression = [39.0, 35.0];
const DEFAULT_ZOOM = 5;
const SELECTED_ZOOM = 15;
const DEFAULT_RADIUS_METERS = 100;
const OPENFREEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://openfreemap.org/">OpenFreeMap</a>';

function numericValue(value?: number | string | null): number | null {
  if (value === null || value === undefined || value === "") return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function validCoordinates(latitude: number | null, longitude: number | null): MapCoordinates | null {
  if (latitude === null || longitude === null) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  return { latitude, longitude };
}

function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

function externalMapLinks(coordinates: MapCoordinates) {
  const lat = coordinates.latitude;
  const lng = coordinates.longitude;
  const label = encodeURIComponent("Program konumu");

  return [
    {
      label: "Google Maps",
      href: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    },
    {
      label: "Apple Maps",
      href: `https://maps.apple.com/?ll=${lat},${lng}&q=${label}`,
    },
    {
      label: "OpenStreetMap",
      href: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`,
    },
  ];
}

function geolocationMessage(status: LocationStatus): string | null {
  if (status === "loading") return "Konum aliniyor...";
  if (status === "success") return "Konum secime islendi.";
  if (status === "error") return "Konum alinamadi. Tarayici iznini kontrol edin.";
  return null;
}

export function ProgramLocationMap({
  latitude,
  longitude,
  radiusMeters,
  mode = "preview",
  heightClassName = "h-72",
  onChange,
}: ProgramLocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletWithMapLibre | null>(null);
  const markerIconRef = useRef<DivIcon | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const circleRef = useRef<Circle | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const selected = useMemo(
    () => validCoordinates(numericValue(latitude), numericValue(longitude)),
    [latitude, longitude],
  );
  const initialSelectedRef = useRef<MapCoordinates | null>(selected);
  const radius = Math.max(numericValue(radiusMeters) ?? DEFAULT_RADIUS_METERS, 1);
  const isPicker = mode === "picker";
  const locationStatusMessage = geolocationMessage(locationStatus);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let disposed = false;

    void import("leaflet")
      .then(async (leafletModule) => {
        const leafletBase = ((leafletModule as LeafletModule).default ?? leafletModule) as typeof import("leaflet");
        const maplibreModule = (await import("maplibre-gl")) as MapLibreModule;
        const browserGlobals = window as MapGlobals;

        browserGlobals.L = leafletBase;
        browserGlobals.maplibregl = maplibreModule.default ?? maplibreModule;

        await import("@maplibre/maplibre-gl-leaflet");
        if (disposed || !containerRef.current || mapRef.current) return;

        const leafletWithMapLibre = (browserGlobals.L ?? leafletBase) as LeafletWithMapLibre;
        if (typeof leafletWithMapLibre.maplibreGL !== "function") {
          throw new Error("MapLibre Leaflet layer could not be registered.");
        }

        leafletRef.current = leafletWithMapLibre;
        markerIconRef.current =
          markerIconRef.current ??
          leafletWithMapLibre.divIcon({
            className: "",
            html: '<span class="program-location-marker"></span>',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

        const initialSelected = initialSelectedRef.current;
        const initialCenter: LatLngExpression = initialSelected ? [initialSelected.latitude, initialSelected.longitude] : TURKEY_CENTER;
        const map = leafletWithMapLibre.map(containerRef.current, {
          attributionControl: true,
          center: initialCenter,
          zoom: initialSelected ? SELECTED_ZOOM : DEFAULT_ZOOM,
          scrollWheelZoom: false,
          zoomControl: true,
        });

        leafletWithMapLibre
          .maplibreGL({
            style: OPENFREEMAP_STYLE_URL,
            attributionControl: false,
          })
          .addTo(map);
        map.attributionControl.addAttribution(MAP_ATTRIBUTION);

        mapRef.current = map;
        setLeafletReady(true);
        setMapLoadError(false);
      })
      .catch((error) => {
        console.error("Program location map could not be loaded", error);
        if (!disposed) setMapLoadError(true);
      });

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
      setLeafletReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    const markerIcon = markerIconRef.current;
    if (!map || !leaflet || !markerIcon || !leafletReady) return;

    const applyCoordinates = (coordinates: MapCoordinates, centerMap = false) => {
      const position: LatLngExpression = [coordinates.latitude, coordinates.longitude];

      if (!markerRef.current) {
        markerRef.current = leaflet
          .marker(position, {
            draggable: isPicker,
            icon: markerIcon,
          })
          .addTo(map);
        markerRef.current.on("dragend", () => {
          const markerPosition = markerRef.current?.getLatLng();
          if (!markerPosition || !onChange) return;
          onChange({ latitude: markerPosition.lat, longitude: markerPosition.lng });
        });
      } else {
        markerRef.current.setLatLng(position);
        if (isPicker) markerRef.current.dragging?.enable();
        else markerRef.current.dragging?.disable();
      }

      if (!circleRef.current) {
        circleRef.current = leaflet
          .circle(position, {
            radius,
            className: "program-location-radius",
          })
          .addTo(map);
      } else {
        circleRef.current.setLatLng(position);
        circleRef.current.setRadius(radius);
      }

      if (centerMap) {
        map.setView(position, Math.max(map.getZoom(), SELECTED_ZOOM));
      }
    };

    if (selected) {
      applyCoordinates(selected);
    } else {
      markerRef.current?.remove();
      circleRef.current?.remove();
      markerRef.current = null;
      circleRef.current = null;
      map.setView(TURKEY_CENTER, DEFAULT_ZOOM);
    }

    const handleClick = (event: LeafletMouseEvent) => {
      if (!isPicker || !onChange) return;
      const coordinates = { latitude: event.latlng.lat, longitude: event.latlng.lng };
      applyCoordinates(coordinates, true);
      onChange(coordinates);
    };

    if (isPicker) {
      map.on("click", handleClick);
      map.getContainer().classList.add("program-location-map-picker");
    } else {
      map.getContainer().classList.remove("program-location-map-picker");
    }

    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.off("click", handleClick);
    };
  }, [isPicker, leafletReady, onChange, radius, selected]);

  const handleUseCurrentLocation = () => {
    if (!isPicker || !onChange) return;
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        mapRef.current?.setView([coordinates.latitude, coordinates.longitude], SELECTED_ZOOM);
        onChange(coordinates);
        setLocationStatus("success");
      },
      () => setLocationStatus("error"),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 },
    );
  };

  const links = selected ? externalMapLinks(selected) : [];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative bg-slate-100">
        <div ref={containerRef} className={`w-full ${heightClassName}`} />

        {!leafletReady && !mapLoadError ? (
          <div className="absolute inset-0 z-[450] flex items-center justify-center bg-slate-100/80 text-sm font-semibold text-slate-600 backdrop-blur-[1px]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#f36d26]" />
            Harita yukleniyor...
          </div>
        ) : null}

        {mapLoadError ? (
          <div className="absolute inset-0 z-[450] flex items-center justify-center bg-slate-100/90 p-4 text-center">
            <div className="max-w-sm rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm">
              Harita yuklenemedi. Koordinat alanlarini manuel kullanabilirsiniz.
            </div>
          </div>
        ) : null}

        {isPicker ? (
          <div className="pointer-events-none absolute right-3 top-3 z-[500] flex max-w-[calc(100%-1.5rem)] flex-col items-end gap-2">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locationStatus === "loading"}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm backdrop-blur transition hover:border-[#f36d26]/40 hover:text-[#f36d26] disabled:cursor-wait disabled:opacity-70"
            >
              {locationStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              Konumumu kullan
            </button>
            {locationStatusMessage ? (
              <span className="pointer-events-auto rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur">
                {locationStatusMessage}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-xs text-slate-500">
          {selected ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
                <Navigation className="h-3.5 w-3.5 text-[#f36d26]" />
                {formatCoordinate(selected.latitude)}, {formatCoordinate(selected.longitude)}
              </span>
              <span>Yaricap: {Math.round(radius).toLocaleString("tr-TR")} m</span>
            </div>
          ) : (
            <span>{isPicker ? "Haritaya tiklayarak konum secin." : "Konum koordinati bulunmuyor."}</span>
          )}
        </div>

        {!isPicker && selected ? (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:border-[#f36d26]/40 hover:bg-[#f36d26]/10 hover:text-[#c54f13]"
              >
                {link.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}