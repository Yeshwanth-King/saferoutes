import { POST } from "@/app/api/maps/routes/route";

describe("POST /api/maps/routes", () => {
  it("returns 500 when API key is missing", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");
    const request = new Request("http://localhost/api/maps/routes", {
      method: "POST",
      body: JSON.stringify({
        origin: { lat: 12.9, lng: 77.6 },
        destination: { lat: 13.0, lng: 77.7 },
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: string };
    expect(response.status).toBe(500);
    expect(body.error).toContain("GOOGLE_MAPS_API_KEY");
    vi.unstubAllEnvs();
  });

  it("returns directions provider data when Directions API succeeds", async () => {
    process.env.GOOGLE_MAPS_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        status: "OK",
        routes: [
          {
            summary: "Route 1",
            overview_polyline: { points: "abc123" },
            legs: [
              {
                duration: { value: 1200 },
                distance: { value: 9000 },
                steps: [{ html_instructions: "<b>Head north</b>" }],
              },
            ],
          },
        ],
      }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const request = new Request("http://localhost/api/maps/routes", {
      method: "POST",
      body: JSON.stringify({
        origin: { lat: 12.9, lng: 77.6 },
        destination: { lat: 13.0, lng: 77.7 },
      }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    const body = (await response.json()) as {
      provider: string;
      routes: Array<{ directionsSteps?: string[] }>;
    };

    expect(response.status).toBe(200);
    expect(body.provider).toBe("directions");
    expect(body.routes).toHaveLength(1);
    expect(body.routes[0].directionsSteps?.[0]).toBe("Head north");
  });
});
