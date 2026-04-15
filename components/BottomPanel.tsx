import AISummary from "@/components/AISummary";
import DirectionsPanel from "@/components/DirectionsPanel";
import RouteCard from "@/components/RouteCard";
import type { Route } from "@/lib/types";

type BottomPanelProps = {
  routes: Route[];
  bestRouteId: string | null;
  aiSummary: string;
};

export default function BottomPanel({
  routes,
  bestRouteId,
  aiSummary,
}: BottomPanelProps) {
  const bestRoute = routes.find((route) => route.id === bestRouteId);

  return (
    <section className="space-y-4">
      <AISummary summary={aiSummary} />
      {bestRoute?.directionsSteps?.length ? (
        <DirectionsPanel
          steps={bestRoute.directionsSteps}
          summary={bestRoute.summary}
          distanceKm={
            typeof bestRoute.distanceMeters === "number"
              ? bestRoute.distanceMeters / 1000
              : undefined
          }
          durationMinutes={
            typeof bestRoute.durationSeconds === "number"
              ? Math.round(bestRoute.durationSeconds / 60)
              : undefined
          }
        />
      ) : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {routes.map((route) => (
          <RouteCard key={route.id} route={route} isBest={route.id === bestRouteId} />
        ))}
      </div>
    </section>
  );
}
