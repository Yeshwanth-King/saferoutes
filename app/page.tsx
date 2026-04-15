"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AlertTicker from "@/components/AlertTicker";
import BottomPanel from "@/components/BottomPanel";
import MapView from "@/components/MapView";
import Sidebar from "@/components/Sidebar";
import { accidentZones, routes as routesData } from "@/lib/mockData";
import { analyzeRoutes } from "@/lib/scoring";
import type {
  MapRouteCandidate,
  Route,
  RoutePoint,
  TrafficLevel,
  Weather,
} from "@/lib/types";
import {
  clearWeatherFallback,
  fetchOpenWeatherLive,
  type WeatherUiMeta,
} from "@/lib/weather";

type LatLngPoint = { lat: number; lng: number };

const defaultSource: LatLngPoint = { lat: 12.88737, lng: 77.59742 };
const defaultDestination: LatLngPoint = { lat: 12.88525, lng: 77.62983 };
const WEATHER_CACHE_MS = 5 * 60 * 1000;

const accidentHotspots = [
  { name: "Silk Board", lat: 12.9177, lng: 77.6233 },
  { name: "Hebbal", lat: 13.0358, lng: 77.597 },
  { name: "Bellandur", lat: 12.9257, lng: 77.6762 },
  { name: "Marathahalli", lat: 12.9591, lng: 77.6974 },
  { name: "KR Puram", lat: 13.0079, lng: 77.6953 },
  { name: "Electronic City Flyover", lat: 12.8403, lng: 77.677 },
  { name: "Whitefield", lat: 12.9698, lng: 77.75 },
  { name: "BTM 4th Stage", lat: 12.8865, lng: 77.608 },
  { name: "Devarachikkanahalli Rd", lat: 12.8858, lng: 77.618 },
] as const;

function haversineMeters(a: RoutePoint, b: RoutePoint): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(aa));
}

function getTrafficLevelByDuration(
  candidate: MapRouteCandidate,
  candidates: MapRouteCandidate[],
): TrafficLevel {
  const durations = candidates
    .map((c) => c.durationSeconds)
    .filter((d): d is number => typeof d === "number" && d > 0);
  if (!durations.length || !candidate.durationSeconds) return "medium";
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  if (candidate.durationSeconds <= min + 60) return "low";
  if (candidate.durationSeconds >= max - 60) return "high";
  return "medium";
}

function getPassesThrough(path: RoutePoint[]): string[] {
  const thresholdMeters = 1500;
  const hits = new Set<string>();
  path.forEach((point) => {
    accidentHotspots.forEach((zone) => {
      const d = haversineMeters(point, { lat: zone.lat, lng: zone.lng });
      if (d <= thresholdMeters) hits.add(zone.name);
    });
  });
  return Array.from(hits);
}

function buildRoutesFromCandidates(candidates: MapRouteCandidate[]): Route[] {
  return candidates.map((candidate, index) => {
    const durationSeconds = candidate.durationSeconds ?? 1800 + index * 300;
    const baseTime = Math.max(8, Math.round(durationSeconds / 60));
    return {
      id: candidate.id,
      name: `Route ${candidate.id}`,
      path: candidate.path,
      baseTime,
      trafficLevel: getTrafficLevelByDuration(candidate, candidates),
      passesThrough: getPassesThrough(candidate.path),
      durationSeconds: candidate.durationSeconds,
      distanceMeters: candidate.distanceMeters,
      summary: candidate.summary,
      directionsSteps: candidate.directionsSteps,
    };
  });
}

function buildRuleSummary(
  bestRoute: Route | undefined,
  weather: Weather,
): string {
  if (!bestRoute) {
    return "Run route analysis to see the safest recommendation.";
  }

  const issueSnippets = (bestRoute.issues ?? []).filter(
    (issue) => !/rain|visibility|storm/i.test(issue),
  );
  const focus =
    issueSnippets.length > 0
      ? ` as it better manages ${issueSnippets.slice(0, 2).join(" and ")}`
      : " for the strongest overall safety balance";

  let text = `${bestRoute.name} is the stronger recommendation${focus} (score ${bestRoute.score}).`;

  if (weather.condition === "rain") {
    text +=
      " Ongoing rain may reduce visibility and nudge travel time slightly higher.";
  } else if (weather.condition === "heavy_rain") {
    text +=
      " Active storms can sharply reduce visibility and materially increase travel time.";
  } else {
    text += " Clear weather supports predictable sightlines and braking.";
  }

  return text;
}

function parseLatLngInput(value: string): LatLngPoint | null {
  const [latRaw, lngRaw] = value.split(",").map((part) => part.trim());
  if (!latRaw || !lngRaw) return null;
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export default function Home() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [bestRouteId, setBestRouteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sourcePoint, setSourcePoint] = useState<LatLngPoint | null>(
    defaultSource,
  );
  const [destinationPoint, setDestinationPoint] = useState<LatLngPoint | null>(
    defaultDestination,
  );
  const [selectionMode, setSelectionMode] = useState<
    "source" | "destination" | null
  >(null);
  const [sourceCoordinateInput, setSourceCoordinateInput] = useState(
    `${defaultSource.lat.toFixed(5)}, ${defaultSource.lng.toFixed(5)}`,
  );
  const [destinationCoordinateInput, setDestinationCoordinateInput] = useState(
    `${defaultDestination.lat.toFixed(5)}, ${defaultDestination.lng.toFixed(5)}`,
  );
  const [sourceAddress, setSourceAddress] = useState("Resolving source address...");
  const [destinationAddress, setDestinationAddress] = useState(
    "Resolving destination address...",
  );
  const [addressLoading, setAddressLoading] = useState(false);
  const [coordinateError, setCoordinateError] = useState<string | null>(null);
  const [weatherState, setWeatherState] = useState<Weather>({
    condition: "clear",
  });
  const [weatherInfo, setWeatherInfo] =
    useState<WeatherUiMeta>(clearWeatherFallback);
  const [aiSummary, setAiSummary] = useState(
    "Analyze routes to get a smart safety summary.",
  );
  const [mapRouteCandidates, setMapRouteCandidates] = useState<
    MapRouteCandidate[]
  >([]);
  const weatherUpdatedAtRef = useRef<number>(0);
  const weatherRefreshingRef = useRef(false);

  const applyWeatherMeta = useCallback((meta: WeatherUiMeta) => {
    weatherUpdatedAtRef.current = Date.now();
    setWeatherInfo(meta);
    setWeatherState({ condition: meta.condition });
  }, []);

  const refreshWeatherInBackground = useCallback(
    async (force = false) => {
      const isFresh =
        Date.now() - weatherUpdatedAtRef.current < WEATHER_CACHE_MS;
      if (!force && isFresh) return;
      if (weatherRefreshingRef.current) return;
      weatherRefreshingRef.current = true;

      try {
        const live = await fetchOpenWeatherLive();
        const meta = live ?? clearWeatherFallback();
        applyWeatherMeta(meta);
      } finally {
        weatherRefreshingRef.current = false;
      }
    },
    [applyWeatherMeta],
  );

  useEffect(() => {
    void refreshWeatherInBackground(true);
  }, [refreshWeatherInBackground]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshWeatherInBackground();
    }, WEATHER_CACHE_MS);
    return () => window.clearInterval(timer);
  }, [refreshWeatherInBackground]);

  useEffect(() => {
    if (!sourcePoint || !destinationPoint) return;
    let cancelled = false;
    setAddressLoading(true);

    const fetchAddress = async (
      point: LatLngPoint,
      setAddress: (value: string) => void,
      fallbackLabel: string,
    ) => {
      try {
        const params = new URLSearchParams({
          lat: String(point.lat),
          lng: String(point.lng),
        });
        const response = await fetch(`/api/maps/geocode?${params.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          setAddress(`${fallbackLabel}: ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`);
          return;
        }
        const payload = (await response.json()) as { address?: string };
        setAddress(
          payload.address ??
            `${fallbackLabel}: ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
        );
      } catch {
        setAddress(`${fallbackLabel}: ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`);
      }
    };

    void Promise.all([
      fetchAddress(sourcePoint, (value) => {
        if (!cancelled) setSourceAddress(value);
      }, "Source"),
      fetchAddress(destinationPoint, (value) => {
        if (!cancelled) setDestinationAddress(value);
      }, "Destination"),
    ]).finally(() => {
      if (!cancelled) setAddressLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [sourcePoint, destinationPoint]);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      // Use cached weather immediately for fast UX.
      const weatherToUse = weatherState;
      const routeInputs =
        mapRouteCandidates.length > 0
          ? buildRoutesFromCandidates(mapRouteCandidates)
          : routesData;
      const result = analyzeRoutes(routeInputs, weatherToUse, accidentZones);
      setRoutes(result.routes);
      setBestRouteId(result.bestRouteId);

      const bestRoute = result.routes.find(
        (route) => route.id === result.bestRouteId,
      );
      setAiSummary(buildRuleSummary(bestRoute, weatherToUse));
      // Keep weather fresh in background while user interacts with the map.
      void refreshWeatherInBackground();
    } catch {
      const fallbackWeather: Weather = { condition: "clear" };
      applyWeatherMeta(clearWeatherFallback());
      const fallbackResult = analyzeRoutes(
        mapRouteCandidates.length > 0
          ? buildRoutesFromCandidates(mapRouteCandidates)
          : routesData,
        fallbackWeather,
        accidentZones,
      );
      setRoutes(fallbackResult.routes);
      setBestRouteId(fallbackResult.bestRouteId);
      setAiSummary(
        "Live weather unavailable — scored with clear conditions. Analysis still updated.",
      );
    } finally {
      setLoading(false);
    }
  };

  const alerts = useMemo(() => {
    const city = weatherInfo.cityName;
    const weatherLine = weatherInfo.fromApi
      ? `🌩️ ${weatherInfo.description} in ${city}`
      : `☀️ ${weatherInfo.headline}`;

    const visibilityLine =
      weatherState.condition === "clear"
        ? "✅ Good visibility expected for driving."
        : "⚠️ Reduced visibility expected — slow down and widen gaps.";

    const topAccidentAreas = Object.entries(accidentZones)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([area, count]) => `${area} (${count})`);
    const highTrafficRoutes = routes
      .filter((route) => route.trafficLevel === "high")
      .map((route) => route.name);

    return [
      weatherLine,
      visibilityLine,
      `Top accident-prone zones: ${topAccidentAreas.join(", ")}.`,
      highTrafficRoutes.length
        ? `Heavy congestion on: ${highTrafficRoutes.join(", ")}.`
        : "No high-traffic routes currently flagged.",
    ];
  }, [routes, weatherInfo, weatherState.condition]);

  const applySourceCoordinates = useCallback(() => {
    const parsed = parseLatLngInput(sourceCoordinateInput);
    if (!parsed) {
      setCoordinateError("Invalid start coordinates. Use format: lat, lng");
      return;
    }
    setSourcePoint(parsed);
    setSourceCoordinateInput(
      `${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`,
    );
    setCoordinateError(null);
  }, [sourceCoordinateInput]);

  const applyDestinationCoordinates = useCallback(() => {
    const parsed = parseLatLngInput(destinationCoordinateInput);
    if (!parsed) {
      setCoordinateError(
        "Invalid destination coordinates. Use format: lat, lng",
      );
      return;
    }
    setDestinationPoint(parsed);
    setDestinationCoordinateInput(
      `${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`,
    );
    setCoordinateError(null);
  }, [destinationCoordinateInput]);

  const debugPayload = useMemo(
    () => ({
      weather: weatherState,
      weatherInfo,
      sourcePoint,
      destinationPoint,
      bestRouteId,
      routes,
      mapRouteCandidates,
    }),
    [
      bestRouteId,
      destinationPoint,
      mapRouteCandidates,
      routes,
      sourcePoint,
      weatherInfo,
      weatherState,
    ],
  );

  return (
    <main className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        loading={loading}
        onAnalyze={() => void handleAnalyze()}
        weatherCondition={weatherState.condition}
        weatherHeadline={weatherInfo.headline}
        weatherDetail={
          weatherInfo.fromApi
            ? `${weatherInfo.description} · ${weatherInfo.cityName}`
            : "Set OPENWEATHER_API_KEY in .env.local and restart next dev. Invalid keys or city names also fall back to clear."
        }
        sourceCoordinateInput={sourceCoordinateInput}
        destinationCoordinateInput={destinationCoordinateInput}
        sourceAddress={sourceAddress}
        destinationAddress={destinationAddress}
        addressLoading={addressLoading}
        coordinateError={coordinateError}
        selectionMode={selectionMode}
        onSourceCoordinateInputChange={setSourceCoordinateInput}
        onDestinationCoordinateInputChange={setDestinationCoordinateInput}
        onApplySourceCoordinates={applySourceCoordinates}
        onApplyDestinationCoordinates={applyDestinationCoordinates}
        onSelectSource={() => setSelectionMode("source")}
        onSelectDestination={() => setSelectionMode("destination")}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AlertTicker alerts={alerts} />
        <section className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
            <MapView
              routes={routes}
              bestRouteId={bestRouteId}
              source={sourcePoint}
              destination={destinationPoint}
              selectionMode={selectionMode}
              onPickPoint={(kind, point) => {
                if (kind === "source") {
                  setSourcePoint(point);
                  setSourceCoordinateInput(
                    `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
                  );
                } else {
                  setDestinationPoint(point);
                  setDestinationCoordinateInput(
                    `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
                  );
                }
                setCoordinateError(null);
                setSelectionMode(null);
              }}
              onRoutesComputed={setMapRouteCandidates}
            />
            <BottomPanel
              routes={routes}
              bestRouteId={bestRouteId}
              aiSummary={aiSummary}
            />
            {process.env.NODE_ENV !== "production" ? (
              <details className="rounded-lg border border-border bg-card/60 p-3">
                <summary className="cursor-pointer text-xs uppercase tracking-wide text-muted-foreground">
                  Raw JSON (phase validation)
                </summary>
                <pre className="no-scrollbar mt-3 max-h-[40vh] overflow-auto rounded bg-muted p-3 text-xs text-foreground">
                  {JSON.stringify(debugPayload, null, 2)}
                </pre>
              </details>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
