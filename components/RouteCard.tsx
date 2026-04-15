 "use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Clock, Shield } from "lucide-react";

import type { Route } from "@/lib/types";

type RouteCardProps = {
  route: Route;
  isBest: boolean;
};

export default function RouteCard({ route, isBest }: RouteCardProps) {
  const score = route.score ?? 0;
  const level = route.level ?? "moderate";
  const [animatedScore, setAnimatedScore] = useState(0);
  const riskLabel = level === "safe" ? "Low Risk" : level === "risky" ? "High Risk" : "Moderate";
  const riskClass =
    level === "safe"
      ? "bg-safe/15 text-safe"
      : level === "risky"
        ? "bg-danger/15 text-danger"
        : "bg-warning/15 text-warning";

  useEffect(() => {
    let frame = 0;
    const totalFrames = 20;
    const interval = window.setInterval(() => {
      frame += 1;
      const nextScore = Math.round((score * frame) / totalFrames);
      setAnimatedScore(nextScore);
      if (frame >= totalFrames) {
        window.clearInterval(interval);
      }
    }, 18);

    return () => window.clearInterval(interval);
  }, [score]);

  return (
    <article
      className={`rounded-xl border p-5 transition-all duration-300 ${
        isBest
          ? "border-primary/30 bg-card shadow-lg shadow-primary/5"
          : "border-border bg-card hover:shadow-md"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            {isBest ? <CheckCircle className="size-4 text-primary" /> : null}
            <h3 className="text-lg font-semibold text-foreground">{route.name}</h3>
          </div>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${riskClass}`}>
          {riskLabel}
        </span>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        {route.summary ?? "Safety-optimized route based on weather and traffic conditions."}
      </p>

      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Shield className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Safety Score</span>
          </div>
          <span className="text-sm font-bold text-foreground tabular-nums">{animatedScore}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full animate-score-fill rounded-full ${
              animatedScore >= 80
                ? "bg-safe"
                : animatedScore >= 60
                  ? "bg-warning"
                  : "bg-danger"
            }`}
            style={{ "--score-width": `${score}%` } as React.CSSProperties}
          />
        </div>
      </div>

      <div className="mb-3 flex items-center gap-1.5">
        <Clock className="size-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">ETA: {route.baseTime} min</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {(route.issues ?? []).map((issue) => (
          <span
            key={`${route.id}-${issue}`}
            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground"
          >
            <AlertTriangle className="size-2.5" />
            {issue}
          </span>
        ))}
      </div>

      {isBest ? (
        <div className="mt-3 border-t border-border pt-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
            <CheckCircle className="size-3" />
            Recommended by AI
          </span>
        </div>
      ) : null}
    </article>
  );
}
