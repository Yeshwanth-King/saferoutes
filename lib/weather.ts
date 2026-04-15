import type { WeatherCondition } from "@/lib/types";

export type WeatherUiMeta = {
  condition: WeatherCondition;
  cityName: string;
  description: string;
  headline: string;
  fromApi: boolean;
};

/**
 * Maps OpenWeather `weather[].main` into scoring conditions.
 * Rain → penalty 10, Thunderstorm → heavy_rain (penalty 20), else clear.
 */
export function mapOpenWeatherMain(main: string): WeatherCondition {
  const m = main.trim().toLowerCase();
  if (m === "thunderstorm") return "heavy_rain";
  if (m === "rain" || m === "drizzle") return "rain";
  return "clear";
}

export function buildHeadline(condition: WeatherCondition): string {
  if (condition === "heavy_rain") {
    return "⛈️ Storms detected — sharply reduced visibility";
  }
  if (condition === "rain") {
    return "🌧️ Rain detected — visibility reduced";
  }
  return "☀️ Clear conditions — good visibility";
}

export function parseOpenWeatherPayload(
  payload: unknown,
  fallbackCity: string,
): WeatherUiMeta | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as {
    name?: string;
    weather?: Array<{ main?: string; description?: string }>;
    timezone?: string;
    current?: {
      weather?: Array<{ main?: string; description?: string }>;
    };
  };
  // Supports both:
  // - Current Weather API 2.5: payload.weather[0]
  // - One Call API 3.0: payload.current.weather[0]
  const w0 = p.current?.weather?.[0] ?? p.weather?.[0];
  const main = w0?.main;
  if (!main) return null;

  const condition = mapOpenWeatherMain(main);
  const cityName = p.name || fallbackCity || p.timezone || "Selected area";
  const description = (w0.description || main).replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    condition,
    cityName,
    description,
    headline: buildHeadline(condition),
    fromApi: true,
  };
}

/**
 * Fetches live weather via same-origin `/api/weather` so the API key can live
 * in **server** env (`OPENWEATHER_API_KEY`) without `NEXT_PUBLIC_`.
 * Falls back to `null` if the proxy fails — caller should use clear weather.
 */
export async function fetchOpenWeatherLive(): Promise<WeatherUiMeta | null> {
  try {
    const response = await fetch("/api/weather", { cache: "no-store" });
    if (!response.ok || response.status === 503) return null;
    const data = (await response.json()) as WeatherUiMeta & { error?: string };
    if (data.error || !data.fromApi) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearWeatherFallback(city = "Bengaluru"): WeatherUiMeta {
  return {
    condition: "clear",
    cityName: city,
    description: "Clear",
    headline: "☀️ Live weather unavailable — assuming clear conditions.",
    fromApi: false,
  };
}
