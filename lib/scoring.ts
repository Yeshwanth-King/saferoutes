import type { Route, Weather } from "@/lib/types";

const trafficPenaltyMap = {
  low: 5,
  medium: 15,
  high: 30,
} as const;

const weatherPenaltyMap = {
  clear: 0,
  rain: 10,
  heavy_rain: 20,
} as const;

function getAccidentPenalty(
  route: Route,
  accidentZones: Record<string, number>,
): number {
  return route.passesThrough.reduce((total, area) => {
    return total + (accidentZones[area] || 0);
  }, 0);
}

export function calculateScore(
  route: Route,
  weather: Weather,
  accidentZones: Record<string, number>,
): number {
  const trafficPenalty = trafficPenaltyMap[route.trafficLevel];
  const accidentPenalty = getAccidentPenalty(route, accidentZones);
  const weatherPenalty = weatherPenaltyMap[weather.condition];

  return 100 - (trafficPenalty + accidentPenalty + weatherPenalty);
}

export function getSafetyLevel(score: number): "safe" | "moderate" | "risky" {
  if (score >= 80) return "safe";
  if (score >= 50) return "moderate";
  return "risky";
}

export function getIssues(
  route: Route,
  weather: Weather,
  accidentZones: Record<string, number>,
): string[] {
  const issues: string[] = [];

  if (route.trafficLevel === "high") {
    issues.push("Heavy traffic");
  } else if (route.trafficLevel === "medium") {
    issues.push("Moderate traffic");
  }

  route.passesThrough.forEach((area) => {
    if (accidentZones[area]) {
      issues.push(`Accident-prone area: ${area}`);
    }
  });

  if (weather.condition === "heavy_rain") {
    issues.push("Storms may sharply reduce visibility");
  } else if (weather.condition === "rain") {
    issues.push("Rain may affect visibility");
  }

  return issues;
}

export function analyzeRoutes(
  routes: Route[],
  weather: Weather,
  accidentZones: Record<string, number>,
): { routes: Route[]; bestRouteId: string | null } {
  if (!routes.length) {
    return { routes: [], bestRouteId: null };
  }

  const processed = routes.map((route) => {
    const score = calculateScore(route, weather, accidentZones);

    return {
      ...route,
      score,
      level: getSafetyLevel(score),
      issues: getIssues(route, weather, accidentZones),
    };
  });

  const bestRoute = processed.reduce((best, curr) =>
    (curr.score ?? -Infinity) > (best.score ?? -Infinity) ? curr : best,
  );

  return {
    routes: processed,
    bestRouteId: bestRoute.id,
  };
}
