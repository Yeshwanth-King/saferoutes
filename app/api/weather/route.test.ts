import { GET } from "@/app/api/weather/route";

describe("GET /api/weather", () => {
  it("returns 503 when weather API key is missing", async () => {
    const response = await GET();
    const body = (await response.json()) as { error: string };
    expect(response.status).toBe(503);
    expect(body.error).toBe("missing_key");
  });

  it("returns parsed weather metadata when upstream responds", async () => {
    process.env.OPENWEATHER_API_KEY = "test-key";
    process.env.OPENWEATHER_CITY = "Bengaluru";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          name: "Bengaluru",
          weather: [{ main: "Rain", description: "moderate rain" }],
        }),
      ),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET();
    const body = (await response.json()) as {
      condition: string;
      cityName: string;
      fromApi: boolean;
    };
    expect(response.status).toBe(200);
    expect(body.condition).toBe("rain");
    expect(body.cityName).toBe("Bengaluru");
    expect(body.fromApi).toBe(true);
  });
});
