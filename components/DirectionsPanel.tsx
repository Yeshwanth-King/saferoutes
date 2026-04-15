import {
  ArrowRight,
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  Flag,
  Navigation,
} from "lucide-react";

type DirectionsPanelProps = {
  steps: string[];
  summary?: string;
  durationMinutes?: number;
  distanceKm?: number;
};

function getStepIcon(step: string) {
  const lower = step.toLowerCase();
  if (lower.includes("right")) return CornerUpRight;
  if (lower.includes("left")) return CornerUpLeft;
  if (lower.includes("north") || lower.includes("straight") || lower.includes("head")) return ArrowUp;
  if (lower.includes("arrive") || lower.includes("destination")) return Flag;
  return ArrowRight;
}

export default function DirectionsPanel({
  steps,
  summary,
  durationMinutes,
  distanceKm,
}: DirectionsPanelProps) {
  if (!steps.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
            <Navigation className="size-4 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Directions</h3>
        </div>
        <div className="text-xs text-muted-foreground">
          {summary ? <span className="font-semibold text-foreground">{summary}</span> : null}
          {distanceKm ? <span>{summary ? " | " : ""}{distanceKm.toFixed(1)} km</span> : null}
          {durationMinutes ? (
            <span>{summary || distanceKm ? " | " : ""}{durationMinutes} min</span>
          ) : null}
        </div>
      </div>

      <ol className="space-y-2">
        {steps.map((step, index) => {
          const Icon = getStepIcon(step);
          return (
            <li key={`step-${index}`} className="flex items-start gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon className="size-3.5" />
              </div>
              <div className="pt-1">
                <p className="text-sm text-foreground">{step}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
