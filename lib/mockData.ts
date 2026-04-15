import type { Route, Weather } from "@/lib/types";

export const accidentZones: Record<string, number> = {
  "Silk Board": 25,
  Hebbal: 20,
  Bellandur: 18,
  Marathahalli: 17,
  "KR Puram": 15,
  "Electronic City Flyover": 22,
  Whitefield: 16,
};

export const routes: Route[] = [
  {
    id: "A",
    name: "Route A",
    path: [
      { lat: 12.94, lng: 77.62 },
      { lat: 12.93, lng: 77.64 },
      { lat: 12.92, lng: 77.66 },
    ],
    baseTime: 25,
    trafficLevel: "high",
    passesThrough: ["Silk Board"],
  },
  {
    id: "B",
    name: "Route B",
    path: [
      { lat: 12.95, lng: 77.61 },
      { lat: 12.96, lng: 77.64 },
      { lat: 12.97, lng: 77.67 },
    ],
    baseTime: 32,
    trafficLevel: "medium",
    passesThrough: ["HSR Layout"],
  },
  {
    id: "C",
    name: "Route C",
    path: [
      { lat: 12.91, lng: 77.59 },
      { lat: 12.9, lng: 77.63 },
      { lat: 12.89, lng: 77.69 },
    ],
    baseTime: 40,
    trafficLevel: "low",
    passesThrough: ["Bellandur"],
  },
];

export const weather: Weather = {
  condition: "rain",
};
