import { GET } from "@/app/api/maps/geocode/route";

describe("GET /api/maps/geocode", () => {
  it("returns 400 for invalid coordinates", async () => {
    const request = new Request("http://localhost/api/maps/geocode?lat=abc&lng=77.6");
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("returns 500 when API key is missing", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");
    const request = new Request("http://localhost/api/maps/geocode?lat=12.9&lng=77.6");
    const response = await GET(request);
    expect(response.status).toBe(500);
    vi.unstubAllEnvs();
  });

  it("returns formatted address when geocode succeeds", async () => {
    process.env.GOOGLE_MAPS_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        status: "OK",
        results: [{ formatted_address: "MG Road, Bengaluru, Karnataka, India" }],
      }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const request = new Request("http://localhost/api/maps/geocode?lat=12.9716&lng=77.5946");
    const response = await GET(request);
    const body = (await response.json()) as { address: string };

    expect(response.status).toBe(200);
    expect(body.address).toContain("Bengaluru");
  });
});
