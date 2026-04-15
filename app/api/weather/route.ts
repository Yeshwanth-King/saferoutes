import { NextResponse } from "next/server";

import { parseOpenWeatherPayload } from "@/lib/weather";

function normalizeEnv(value: string | undefined): string {
  if (!value) return "";
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

/**
 * Server-side OpenWeather proxy. Use either:
 * - `OPENWEATHER_API_KEY` (recommended — not sent to the browser), or
 * - `NEXT_PUBLIC_OPENWEATHER_API_KEY` (works the same on the server).
 *
 * City: `OPENWEATHER_CITY` or `NEXT_PUBLIC_OPENWEATHER_CITY` (default: Bengaluru).
 * One Call coordinates: `OPENWEATHER_LAT`, `OPENWEATHER_LON` (optional).
 */
export async function GET() {
  const requestId = `wx-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const apiKey = normalizeEnv(
    process.env.OPENWEATHER_API_KEY ?? process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY,
  );
  const city = normalizeEnv(
    process.env.OPENWEATHER_CITY ?? process.env.NEXT_PUBLIC_OPENWEATHER_CITY,
  ) || "Bengaluru";
  const lat = normalizeEnv(process.env.OPENWEATHER_LAT);
  const lon = normalizeEnv(process.env.OPENWEATHER_LON);
  const hasCoords = Boolean(lat && lon);

  console.info("[weather]", requestId, "start", {
    city,
    hasCoords,
    hasKey: Boolean(apiKey),
  });

  if (!apiKey) {
    console.error("[weather]", requestId, "missing_api_key");
    return NextResponse.json(
      { error: "missing_key", message: "No OpenWeather API key in server environment." },
      { status: 503 },
    );
  }

  try {
    // Preferred path from docs: One Call 3.0 (requires subscription + lat/lon).
    if (lat && lon) {
      console.info("[weather]", requestId, "try_onecall");
      const oneCallUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${encodeURIComponent(
        lat,
      )}&lon=${encodeURIComponent(
        lon,
      )}&exclude=minutely,hourly,daily,alerts&units=metric&appid=${encodeURIComponent(apiKey)}`;
      const oneCallRes = await fetch(oneCallUrl, { cache: "no-store" });
      const oneCallText = await oneCallRes.text();
      console.info("[weather]", requestId, "onecall_status", {
        ok: oneCallRes.ok,
        status: oneCallRes.status,
      });
      if (oneCallRes.ok) {
        try {
          const oneCallJson = JSON.parse(oneCallText) as unknown;
          const oneCallMeta = parseOpenWeatherPayload(oneCallJson, city);
          if (oneCallMeta) {
            console.info("[weather]", requestId, "onecall_success", {
              condition: oneCallMeta.condition,
              city: oneCallMeta.cityName,
            });
            return NextResponse.json(oneCallMeta);
          }
          console.warn("[weather]", requestId, "onecall_unparseable");
        } catch {
          console.warn("[weather]", requestId, "onecall_invalid_json");
          // Continue to fallback.
        }
      } else {
        console.warn("[weather]", requestId, "onecall_failed", {
          status: oneCallRes.status,
        });
      }
    } else {
      console.info("[weather]", requestId, "skip_onecall_no_coords");
    }

    // Fallback path for free tiers / missing One Call plan.
    console.info("[weather]", requestId, "try_current_weather", { city });
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city,
    )}&units=metric&appid=${encodeURIComponent(apiKey)}`;
    const currentRes = await fetch(currentUrl, { cache: "no-store" });
    const currentText = await currentRes.text();
    if (!currentRes.ok) {
      console.error("[weather]", requestId, "current_failed", {
        status: currentRes.status,
      });
      return NextResponse.json(
        {
          error: "openweather_http",
          status: currentRes.status,
          message: "OpenWeather request failed.",
        },
        { status: 502 },
      );
    }

    try {
      const currentJson = JSON.parse(currentText) as unknown;
      const currentMeta = parseOpenWeatherPayload(currentJson, city);
      if (!currentMeta) {
        console.error("[weather]", requestId, "current_unparseable");
        return NextResponse.json({ error: "unparseable" }, { status: 502 });
      }
      console.info("[weather]", requestId, "current_success", {
        condition: currentMeta.condition,
        city: currentMeta.cityName,
      });
      return NextResponse.json(currentMeta);
    } catch {
      console.error("[weather]", requestId, "current_invalid_json");
      return NextResponse.json({ error: "invalid_json" }, { status: 502 });
    }
  } catch (e) {
    const err = e as {
      message?: string;
      name?: string;
      code?: string;
      cause?: unknown;
    };
    const message = err?.message || "fetch failed";
    const cause =
      typeof err?.cause === "object" && err.cause
        ? JSON.stringify(err.cause).slice(0, 300)
        : String(err?.cause ?? "");
    console.error("[weather]", requestId, "network_error", {
      name: err?.name ?? "Error",
      code: err?.code ?? "unknown",
      message,
      cause,
    });
    return NextResponse.json({ error: "network", message }, { status: 502 });
  }
}
