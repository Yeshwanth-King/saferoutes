"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState, type MutableRefObject } from "react";

import { decodeEncodedPolyline } from "@/lib/decodePolyline";
import type { MapRouteCandidate, Route } from "@/lib/types";

type MapViewProps = {
  routes: Route[];
  bestRouteId: string | null;
  source: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  selectionMode: "source" | "destination" | null;
  onPickPoint: (
    kind: "source" | "destination",
    point: { lat: number; lng: number },
  ) => void;
  onRoutesComputed?: (candidates: MapRouteCandidate[]) => void;
};

declare global {
  interface Window {
    google?: any;
    /** Loader cache for Maps JS bootstrap (use `importLibrary("routes")` — no legacy `libraries=directions`). */
    __safeRouteMapsLoader?: Promise<any> | undefined;
  }
}

const fallbackCenter = { lat: 12.9716, lng: 77.5946 };
const strokeByRouteId: Record<string, string> = {
  A: "#ef4444",
  B: "#f59e0b",
  C: "#3b82f6",
};
const mapPickCursor =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23ef4444' d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z'/%3E%3Ccircle cx='12' cy='9' r='2.5' fill='white'/%3E%3C/svg%3E\") 12 22, crosshair";

function loadGoogleMapsScript(apiKey: string): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("No window"));
  }
  if (window.google?.maps?.Map) {
    return Promise.resolve(window.google.maps);
  }

  if (window.__safeRouteMapsLoader) {
    return window.__safeRouteMapsLoader;
  }

  window.__safeRouteMapsLoader = new Promise((resolve, reject) => {
    const callbackName = `__safeRouteInitMaps_${Date.now()}`;
    (window as unknown as Record<string, unknown>)[callbackName] = () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      if (window.google?.maps?.Map) {
        resolve(window.google.maps);
      } else {
        window.__safeRouteMapsLoader = undefined;
        reject(new Error("Google Maps callback ran but maps API is missing"));
      }
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&callback=${encodeURIComponent(callbackName)}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      window.__safeRouteMapsLoader = undefined;
      reject(new Error("Failed to load Google Maps script"));
    };
    document.head.appendChild(script);
  });

  return window.__safeRouteMapsLoader;
}

type ApiRouteLeg = {
  encodedPolyline: string;
  durationSeconds: number;
  distanceMeters: number;
  summary?: string;
  directionsSteps?: string[];
};

function straightLinePath(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): { lat: number; lng: number }[] {
  return [a, b];
}

function routePathToLatLngs(route: {
  path?: unknown;
}): { lat: number; lng: number }[] {
  const raw = route.path;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((pt: any) => ({
    lat: typeof pt.lat === "function" ? pt.lat() : Number(pt.lat),
    lng: typeof pt.lng === "function" ? pt.lng() : Number(pt.lng),
  }));
}

/**
 * Non-legacy browser routing: `Route.computeRoutes` via dynamic `importLibrary("routes")`.
 * Requires **Routes API** enabled for the Maps JavaScript API key (same project as the map).
 * @see https://developers.google.com/maps/documentation/javascript/routes/routes-js-migration
 */
async function requestClientRoutesPathsFromJsApi(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<{ lat: number; lng: number }[][]> {
  const maps = window.google?.maps;
  if (!maps?.importLibrary) {
    throw new Error("google.maps.importLibrary is not available");
  }

  const { Route } = await maps.importLibrary("routes");
  const request = {
    origin,
    destination,
    travelMode: "DRIVING",
    computeAlternativeRoutes: true,
    fields: ["path", "routeLabels"],
  };

  const result = await Route.computeRoutes(request);
  const list = result?.routes as Array<{ path?: unknown }> | undefined;
  if (!list?.length) {
    throw new Error("Route.computeRoutes returned no routes");
  }

  const paths = list
    .map((route) => routePathToLatLngs(route))
    .filter((p) => p.length > 0)
    .slice(0, 3);

  if (!paths.length) {
    throw new Error(
      "Route.computeRoutes returned routes without path geometry",
    );
  }

  return paths;
}

function drawRoutePolylines(
  map: any,
  paths: { lat: number; lng: number }[][],
  bestRouteId: string | null,
  routeCandidatesRef: MutableRefObject<any[]>,
) {
  routeCandidatesRef.current.forEach((poly) => poly.setMap(null));
  routeCandidatesRef.current = [];

  const bounds = new window.google.maps.LatLngBounds();
  paths.forEach((path, index) => {
    const routeId = ["A", "B", "C"][index] ?? `R${index + 1}`;
    const isBest = routeId === bestRouteId;
    path.forEach((p) => bounds.extend(p));
    const polyline = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: isBest ? "#22c55e" : (strokeByRouteId[routeId] ?? "#e2e8f0"),
      strokeOpacity: isBest ? 1 : 0.72,
      strokeWeight: isBest ? 8 : 5,
    });
    polyline.setMap(map);
    routeCandidatesRef.current.push(polyline);
  });
  map.fitBounds(bounds, 48);
}

export default function MapView({
  routes,
  bestRouteId,
  source,
  destination,
  selectionMode,
  onPickPoint,
  onRoutesComputed,
}: MapViewProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const routeCandidatesRef = useRef<any[]>([]);
  const routePathsRef = useRef<{ lat: number; lng: number }[][]>([]);
  const mapClickListenerRef = useRef<any>(null);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [routesHint, setRoutesHint] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) return;
    if (!mapElementRef.current) return;
    if (mapRef.current) return;

    let isMounted = true;
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!isMounted || !mapElementRef.current || !window.google?.maps) return;
        if (mapRef.current) return;

        const initialPoint = source ?? fallbackCenter;
        mapRef.current = new window.google.maps.Map(mapElementRef.current, {
          center: initialPoint,
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        setMapStatus("ready");
      })
      .catch(() => {
        if (isMounted) setMapStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey, source]);

  useEffect(() => {
    if (
      !window.google?.maps ||
      !mapRef.current ||
      mapStatus !== "ready" ||
      !selectionMode
    ) {
      return;
    }

    if (mapClickListenerRef.current) {
      window.google.maps.event.removeListener(mapClickListenerRef.current);
      mapClickListenerRef.current = null;
    }

    mapClickListenerRef.current = mapRef.current.addListener(
      "click",
      (event: any) => {
        const latLng = event.latLng;
        if (!latLng || !selectionMode) return;
        onPickPoint(selectionMode, { lat: latLng.lat(), lng: latLng.lng() });
      },
    );

    return () => {
      if (mapClickListenerRef.current) {
        window.google.maps.event.removeListener(mapClickListenerRef.current);
        mapClickListenerRef.current = null;
      }
    };
  }, [mapStatus, onPickPoint, selectionMode]);

  useEffect(() => {
    if (!window.google?.maps || !mapRef.current || mapStatus !== "ready")
      return;
    mapRef.current.setOptions({
      draggableCursor: selectionMode ? mapPickCursor : undefined,
      draggingCursor: selectionMode ? "grabbing" : undefined,
    });
  }, [mapStatus, selectionMode]);

  useEffect(() => {
    if (!window.google?.maps || !mapRef.current || mapStatus !== "ready")
      return;
    if (!source || !destination) return;

    let cancelled = false;

    routeCandidatesRef.current.forEach((poly) => poly.setMap(null));
    routeCandidatesRef.current = [];
    void (async () => {
      let candidates: MapRouteCandidate[] | null = null;
      let hint: string | null = null;

      try {
        const res = await fetch("/api/maps/routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin: source, destination }),
        });
        let payload: {
          routes?: ApiRouteLeg[];
          error?: string;
          details?: { routesApi?: string; directionsApi?: string };
          provider?: string;
        } = {};
        try {
          payload = (await res.json()) as typeof payload;
        } catch {
          payload = {};
        }

        if (res.ok && payload.routes?.length) {
          const decodedCandidates = payload.routes
            .map((r, index) => ({
              id: ["A", "B", "C"][index] ?? `R${index + 1}`,
              path: r.encodedPolyline
                ? decodeEncodedPolyline(r.encodedPolyline)
                : [],
              durationSeconds: r.durationSeconds,
              distanceMeters: r.distanceMeters,
              summary: r.summary,
              directionsSteps: r.directionsSteps,
            }))
            .filter((r) => r.path.length > 0);
          if (decodedCandidates.length > 0) {
            candidates = decodedCandidates;
            hint =
              payload.provider === "directions"
                ? "Road geometry via Directions API (server)."
                : "Road geometry via Routes API (server).";
          }
        }
      } catch {
        /* try browser next */
      }

      if (!candidates?.length && !cancelled) {
        try {
          const browserPaths = await requestClientRoutesPathsFromJsApi(
            source,
            destination,
          );
          candidates = browserPaths.map((path, index) => ({
            id: ["A", "B", "C"][index] ?? `R${index + 1}`,
            path,
          }));
          hint =
            "Road geometry via Maps JS `Route.computeRoutes` (browser). Enable **Routes API** for this API key.";
        } catch (browserErr) {
          const serverNote =
            "Enable **Routes API** in Google Cloud for this project. Server calls also need `GOOGLE_MAPS_API_KEY` without referrer-only restriction.";
          const browserMsg =
            browserErr instanceof Error
              ? browserErr.message
              : "browser routing failed";
          hint = `${serverNote} Browser: ${browserMsg}. Showing straight line.`;
          candidates = [
            {
              id: "A",
              path: straightLinePath(source, destination),
            },
          ];
        }
      }

      if (cancelled || !mapRef.current) return;
      const finalCandidates =
        candidates && candidates.length > 0
          ? candidates
          : [
              {
                id: "A",
                path: straightLinePath(source, destination),
              },
            ];
      const finalPaths = finalCandidates.map((c) => c.path);
      if (!hint) {
        hint = "Showing straight line (no route geometry available).";
      }
      routePathsRef.current = finalPaths;
      drawRoutePolylines(mapRef.current, finalPaths, null, routeCandidatesRef);
      onRoutesComputed?.(finalCandidates);
      setRoutesHint(hint);
    })();

    return () => {
      cancelled = true;
    };
  }, [destination, mapStatus, onRoutesComputed, source]);

  useEffect(() => {
    if (!window.google?.maps || !mapRef.current || mapStatus !== "ready") return;
    const analyzedPaths = routes
      .map((route) => route.path)
      .filter((path) => Array.isArray(path) && path.length > 0);
    const pathsToDraw = analyzedPaths.length ? analyzedPaths : routePathsRef.current;
    if (!pathsToDraw.length) return;
    routePathsRef.current = pathsToDraw;
    drawRoutePolylines(mapRef.current, pathsToDraw, bestRouteId, routeCandidatesRef);
  }, [bestRouteId, mapStatus, routes]);

  useEffect(() => {
    if (!window.google?.maps || !mapRef.current || mapStatus !== "ready")
      return;

    overlaysRef.current.forEach((overlay) => {
      if ("setMap" in overlay && typeof overlay.setMap === "function") {
        overlay.setMap(null);
      }
    });
    overlaysRef.current = [];

    if (!source && !destination) return;

    if (source) {
      const startMarker = new window.google.maps.Marker({
        map: mapRef.current,
        position: source,
        title: "Start",
        label: { text: "S", color: "white", fontWeight: "bold" },
      });
      overlaysRef.current.push(startMarker);
    }

    if (destination) {
      const destinationMarker = new window.google.maps.Marker({
        map: mapRef.current,
        position: destination,
        title: "Destination",
        label: { text: "D", color: "white", fontWeight: "bold" },
      });
      overlaysRef.current.push(destinationMarker);
    }
  }, [destination, mapStatus, source]);

  useEffect(() => {
    if (!window.google?.maps || !mapRef.current || mapStatus !== "ready")
      return;
    if (routes.length && !source && !destination) {
      const first = routes[0].path[0];
      if (first) mapRef.current.panTo(first);
    }
  }, [mapStatus, routes, source, destination]);

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Map View (Google Maps)
        </h2>
        <p
          className="max-w-[55%] text-right text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {selectionMode
            ? `Click map to set ${selectionMode}`
            : routesHint ||
              "Driving routes: server REST, then browser Route.computeRoutes (non-legacy)."}
        </p>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-border bg-muted/40">
        <div ref={mapElementRef} className="h-[280px] w-full" />

        {mapStatus === "loading" ? (
          <div className="absolute inset-0 grid place-items-center bg-muted/85 text-sm text-foreground">
            Loading Google Maps...
          </div>
        ) : null}

        {!apiKey ? (
          <div className="absolute inset-0 grid place-items-center bg-muted/90 px-4 text-center text-sm text-warning">
            Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to enable real maps.
          </div>
        ) : null}

        {mapStatus === "error" ? (
          <div className="absolute inset-0 grid place-items-center bg-muted/90 px-4 text-center text-sm text-danger">
            Failed to load Google Maps. Use a key with Maps JavaScript API
            enabled, and load with callback (already configured). Check browser
            console and key restrictions.
          </div>
        ) : null}
      </div>
    </section>
  );
}
