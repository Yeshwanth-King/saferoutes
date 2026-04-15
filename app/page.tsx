"use client";

import { useMemo, useState } from "react";

import { accidentZones, routes as routesData, weather } from "@/lib/mockData";
import { analyzeRoutes } from "@/lib/scoring";
import type { Route } from "@/lib/types";

export default function Home() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [bestRouteId, setBestRouteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = () => {
    setLoading(true);

    const result = analyzeRoutes(routesData, weather, accidentZones);
    setRoutes(result.routes);
    setBestRouteId(result.bestRouteId);

    // Phase-2 validation checkpoint: inspect deterministic analyzer output.
    console.log("SafeRoute analyze result:", result);
    setLoading(false);
  };

  const debugPayload = useMemo(
    () => ({
      bestRouteId,
      routes,
    }),
    [bestRouteId, routes],
  );

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">SafeRoute</h1>
        <p className="text-sm text-slate-300">
          Phase checkpoint: run route analysis and render raw JSON.
        </p>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading}
          className="w-fit rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {loading ? "Analyzing..." : "Analyze Routes"}
        </button>

        <pre className="max-h-[60vh] overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-4 text-xs leading-relaxed text-emerald-300">
          {JSON.stringify(debugPayload, null, 2)}
        </pre>
      </div>
    </main>
  );
}
