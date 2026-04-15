import { afterEach } from "vitest";

afterEach(() => {
  delete process.env.OPENWEATHER_API_KEY;
  delete process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  delete process.env.OPENWEATHER_CITY;
  delete process.env.NEXT_PUBLIC_OPENWEATHER_CITY;
  delete process.env.OPENWEATHER_LAT;
  delete process.env.OPENWEATHER_LON;
  delete process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
});
