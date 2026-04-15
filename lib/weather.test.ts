import {
  fetchOpenWeatherLive,
  mapOpenWeatherMain,
  parseOpenWeatherPayload,
} from "@/lib/weather";

describe("weather helpers", () => {
  it("maps weather main values to scoring conditions", () => {
    expect(mapOpenWeatherMain("Thunderstorm")).toBe("heavy_rain");
    expect(mapOpenWeatherMain("Drizzle")).toBe("rain");
    expect(mapOpenWeatherMain("Clouds")).toBe("clear");
  });

  it("parses current weather payload", () => {
    const result = parseOpenWeatherPayload(
      {
        name: "Bengaluru",
        weather: [{ main: "Rain", description: "light rain" }],
      },
      "Fallback",
    );
    expect(result).toBeTruthy();
    expect(result?.condition).toBe("rain");
    expect(result?.cityName).toBe("Bengaluru");
  });

  it("returns null when weather API request fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 503, json: vi.fn() } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchOpenWeatherLive()).resolves.toBeNull();
  });
});
