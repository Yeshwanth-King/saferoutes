import { NextResponse } from "next/server";

type LatLng = { lat: number; lng: number };

type NormalizedRoute = {
  encodedPolyline: string;
  durationSeconds: number;
  distanceMeters: number;
  summary?: string;
  directionsSteps?: string[];
};

function parseDurationSeconds(duration: unknown): number {
  if (typeof duration === "string") {
    const match = /^(\d+)s$/.exec(duration);
    if (match) return Number(match[1]);
    const asNum = Number(duration);
    return Number.isFinite(asNum) ? asNum : 0;
  }
  if (duration && typeof duration === "object" && "seconds" in duration) {
    const s = (duration as { seconds?: string }).seconds;
    if (typeof s === "string") return Number(s) || 0;
  }
  return 0;
}

function isValidLatLng(p: unknown): p is LatLng {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.lat === "number" &&
    typeof o.lng === "number" &&
    Number.isFinite(o.lat) &&
    Number.isFinite(o.lng) &&
    o.lat >= -90 &&
    o.lat <= 90 &&
    o.lng >= -180 &&
    o.lng <= 180
  );
}

function normalizeRoutesPayload(rawRoutes: unknown[]): NormalizedRoute[] {
  return (rawRoutes ?? []).map((r) => {
    const route = r as {
      polyline?: { encodedPolyline?: string };
      duration?: unknown;
      distanceMeters?: number;
    };
    return {
      encodedPolyline: route.polyline?.encodedPolyline ?? "",
      durationSeconds: parseDurationSeconds(route.duration),
      distanceMeters: route.distanceMeters ?? 0,
    };
  });
}

/**
 * Routes API v2 — needs `routingPreference` when `computeAlternativeRoutes` is true.
 * @see https://developers.google.com/maps/documentation/routes/alternative-routes
 */
async function fetchComputeRoutes(
  apiKey: string,
  origin: LatLng,
  destination: LatLng,
): Promise<{ ok: boolean; routes: NormalizedRoute[]; errorText: string }> {
  const url = "https://routes.googleapis.com/directions/v2:computeRoutes";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "routes.polyline,routes.duration,routes.distanceMeters,routes.routeLabels",
    },
    body: JSON.stringify({
      origin: {
        location: {
          latLng: { latitude: origin.lat, longitude: origin.lng },
        },
      },
      destination: {
        location: {
          latLng: { latitude: destination.lat, longitude: destination.lng },
        },
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: true,
      polylineQuality: "OVERVIEW",
      languageCode: "en-IN",
      regionCode: "IN",
    }),
  });

  if (!res.ok) {
    return { ok: false, routes: [], errorText: `ROUTES_HTTP_${res.status}` };
  }

  let data: { routes?: unknown[] };
  try {
    data = (await res.json()) as { routes?: unknown[] };
  } catch {
    return { ok: false, routes: [], errorText: "Invalid Routes API JSON" };
  }

  const routes = normalizeRoutesPayload(data.routes ?? []);
  const hasGeometry = routes.some((r) => r.encodedPolyline.length > 0);
  if (!hasGeometry) {
    return { ok: false, routes, errorText: "Routes API returned no polylines" };
  }
  return { ok: true, routes, errorText: "" };
}

/**
 * Classic Directions Web Service (often enabled when Routes is not).
 * Returns same shape as computeRoutes branch.
 */
async function fetchDirectionsJson(
  apiKey: string,
  origin: LatLng,
  destination: LatLng,
): Promise<{ ok: boolean; routes: NormalizedRoute[]; errorText: string }> {
  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    alternatives: "true",
    mode: "driving",
    key: apiKey,
  });
  const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    return { ok: false, routes: [], errorText: `DIRECTIONS_HTTP_${res.status}` };
  }
  let data: {
    status?: string;
    error_message?: string;
    routes?: Array<{
      summary?: string;
      overview_polyline?: { points?: string };
      legs?: Array<{
        duration?: { value?: number };
        distance?: { value?: number };
        steps?: Array<{ html_instructions?: string }>;
      }>;
    }>;
  };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return { ok: false, routes: [], errorText: "Invalid Directions JSON" };
  }

  if (data.status !== "OK" || !data.routes?.length) {
    return {
      ok: false,
      routes: [],
      errorText: data.status || data.error_message || "Directions status not OK",
    };
  }

  const stripHtml = (value: string): string =>
    value
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const routes: NormalizedRoute[] = data.routes.map((r) => {
    const encodedPolyline = r.overview_polyline?.points ?? "";
    let durationSeconds = 0;
    let distanceMeters = 0;
    const directionsSteps: string[] = [];
    for (const leg of r.legs ?? []) {
      durationSeconds += leg.duration?.value ?? 0;
      distanceMeters += leg.distance?.value ?? 0;
      for (const step of leg.steps ?? []) {
        if (step.html_instructions) {
          directionsSteps.push(stripHtml(step.html_instructions));
        }
      }
    }
    return {
      encodedPolyline,
      durationSeconds,
      distanceMeters,
      summary: r.summary,
      directionsSteps: directionsSteps.slice(0, 8),
    };
  });

  const hasGeometry = routes.some((route) => route.encodedPolyline.length > 0);
  if (!hasGeometry) {
    return { ok: false, routes, errorText: "Directions returned no overview polylines" };
  }

  return { ok: true, routes, errorText: "" };
}

/**
 * Prefer GOOGLE_MAPS_API_KEY (server; no HTTP referrer restriction, or IP-restricted).
 * Falls back to NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for local dev.
 *
 * Enable in Google Cloud: **Routes API** (primary) and/or **Directions API** (fallback).
 */
export async function POST(request: Request) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Set GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const origin = (body as { origin?: unknown }).origin;
  const destination = (body as { destination?: unknown }).destination;
  if (!isValidLatLng(origin) || !isValidLatLng(destination)) {
    return NextResponse.json(
      { error: "origin and destination must be { lat, lng } numbers" },
      { status: 400 },
    );
  }

  // Prefer Directions API first for turn-by-turn instruction support.
  const primary = await fetchDirectionsJson(apiKey, origin, destination);
  if (primary.ok) {
    return NextResponse.json({ routes: primary.routes, provider: "directions" });
  }

  const fallback = await fetchComputeRoutes(apiKey, origin, destination);
  if (fallback.ok) {
    return NextResponse.json({ routes: fallback.routes, provider: "routes" });
  }

  return NextResponse.json(
    {
      error: "Both Routes API and Directions API failed.",
      details: {
        directionsApi: primary.errorText.slice(0, 200),
        routesApi: fallback.errorText.slice(0, 200),
      },
    },
    { status: 502 },
  );
}
