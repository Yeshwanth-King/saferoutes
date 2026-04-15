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
  score?: number;
  level?: "safe" | "moderate" | "risky";
  issues?: string[];
};

export type Weather = {
  condition: WeatherCondition;
};
