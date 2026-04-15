import { analyzeRoutes, calculateScore } from "@/lib/scoring";
import type { Route, Weather } from "@/lib/types";

const weather: Weather = { condition: "clear" };
const accidentZones = { A1: 20, A2: 10 };

const baseRoute: Route = {
  id: "A",
  name: "Route A",
  path: [{ lat: 1, lng: 1 }],
  baseTime: 20,
  trafficLevel: "medium",
  passesThrough: [],
};

describe("scoring", () => {
  it("calculates score using traffic, accident, and weather penalties", () => {
    const route: Route = {
      ...baseRoute,
      trafficLevel: "high",
      passesThrough: ["A1"],
    };
    expect(calculateScore(route, weather, accidentZones)).toBe(50);
  });

  it("returns best route id for highest score", () => {
    const routes: Route[] = [
      { ...baseRoute, id: "A", trafficLevel: "high", passesThrough: ["A1"] },
      { ...baseRoute, id: "B", trafficLevel: "low", passesThrough: [] },
    ];
    const result = analyzeRoutes(routes, weather, accidentZones);
    expect(result.bestRouteId).toBe("B");
    expect(result.routes).toHaveLength(2);
    expect(result.routes[1].level).toBe("safe");
  });
});
