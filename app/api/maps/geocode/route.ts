import { NextResponse } from "next/server";

function toFiniteNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidLatLng(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = toFiniteNumber(searchParams.get("lat"));
  const lng = toFiniteNumber(searchParams.get("lng"));
  if (lat === null || lng === null || !isValidLatLng(lat, lng)) {
    return NextResponse.json(
      { error: "lat and lng query params must be valid coordinates" },
      { status: 400 },
    );
  }

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Set GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" },
      { status: 500 },
    );
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(
    `${lat},${lng}`,
  )}&language=en&key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ error: `GEOCODE_HTTP_${response.status}` }, { status: 502 });
    }
    const payload = (await response.json()) as {
      status?: string;
      results?: Array<{ formatted_address?: string }>;
      error_message?: string;
    };

    if (payload.status !== "OK" || !payload.results?.length) {
      return NextResponse.json(
        {
          error: payload.status || "GEOCODE_FAILED",
          details: payload.error_message?.slice(0, 120) ?? "",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      address: payload.results[0].formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    });
  } catch {
    return NextResponse.json({ error: "GEOCODE_NETWORK_ERROR" }, { status: 502 });
  }
}
