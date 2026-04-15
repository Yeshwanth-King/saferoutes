import { AlertTriangle } from "lucide-react";

type AlertTickerProps = {
  alerts: string[];
};

export default function AlertTicker({ alerts }: AlertTickerProps) {
  if (!alerts.length) return null;

  const loop = [...alerts, ...alerts];
  return (
    <div
      className="overflow-hidden border-b border-warning/20 bg-warning/10"
      role="region"
      aria-label="Safety alerts"
    >
      <div
        className="animate-ticker flex whitespace-nowrap py-2.5 motion-reduce:animate-none hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]"
        aria-live="polite"
      >
        {loop.map((alert, index) => (
          <span
            key={`${alert}-${index}`}
            className="inline-flex shrink-0 items-center gap-2 px-5 text-xs font-medium text-warning"
          >
            <AlertTriangle className="size-3.5" />
            {alert}
          </span>
        ))}
      </div>
    </div>
  );
}
