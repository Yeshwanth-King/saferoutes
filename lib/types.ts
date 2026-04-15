export type TrafficLevel = "low" | "medium" | "high";

export type WeatherCondition = "clear" | "rain" | "heavy_rain";

export type RoutePoint = {
  lat: number;
  lng: number;
};

export type Route = {
  id: string;
  name: string;
  path: RoutePoint[];
  baseTime: number;
  trafficLevel: TrafficLevel;
  passesThrough: string[];
  distanceMeters?: number;
  durationSeconds?: number;
  summary?: string;
  directionsSteps?: string[];
  score?: number;
  level?: "safe" | "moderate" | "risky";
  issues?: string[];
};

export type Weather = {
  condition: WeatherCondition;
};

export type MapRouteCandidate = {
  id: string;
  path: RoutePoint[];
  durationSeconds?: number;
  distanceMeters?: number;
  summary?: string;
  directionsSteps?: string[];
};
