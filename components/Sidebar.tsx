import type { WeatherCondition } from "@/lib/types";
import {
  Bell,
  Brain,
  Car,
  CloudSun,
  Flag,
  Map,
  MapPin,
  Navigation,
  Settings,
  Shield,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

type SidebarProps = {
  loading: boolean;
  weatherCondition: WeatherCondition;
  weatherHeadline: string;
  weatherDetail: string;
  sourceCoordinateInput: string;
  destinationCoordinateInput: string;
  coordinateError: string | null;
  selectionMode: "source" | "destination" | null;
  onSourceCoordinateInputChange: (value: string) => void;
  onDestinationCoordinateInputChange: (value: string) => void;
  onApplySourceCoordinates: () => void;
  onApplyDestinationCoordinates: () => void;
  onSelectSource: () => void;
  onSelectDestination: () => void;
  onAnalyze: () => void;
};

function conditionBadge(condition: WeatherCondition): string {
  if (condition === "heavy_rain") return "Storm";
  if (condition === "rain") return "Rain";
  return "Clear";
}

export default function Sidebar({
  loading,
  weatherCondition,
  weatherHeadline,
  weatherDetail,
  sourceCoordinateInput,
  destinationCoordinateInput,
  coordinateError,
  selectionMode,
  onSourceCoordinateInputChange,
  onDestinationCoordinateInputChange,
  onApplySourceCoordinates,
  onApplyDestinationCoordinates,
  onSelectSource,
  onSelectDestination,
  onAnalyze,
}: SidebarProps) {
  const navItems = [
    { icon: Map, label: "Map View", active: true },
    { icon: Shield, label: "Route Safety", active: false },
    { icon: Bell, label: "Alerts", active: false },
    { icon: Brain, label: "AI Summary", active: false },
  ];

  return (
    <aside className="no-scrollbar flex h-screen w-72 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary">
            <Navigation className="size-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">SafeRoute</h1>
            <p className="text-xs text-sidebar-foreground/60">
              AI Route Analysis
            </p>
          </div>
        </div>
      </div>

      <nav className="space-y-1 px-3">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
              item.active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-6 space-y-4 px-6">
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Source
          </label>
          <div
            className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2"
            onClick={onSelectSource}
          >
            <MapPin className="size-3.5 shrink-0 text-sidebar-primary" />
            <input
              type="text"
              value={sourceCoordinateInput}
              onChange={(event) =>
                onSourceCoordinateInputChange(event.target.value)
              }
              onBlur={onApplySourceCoordinates}
              onKeyDown={(event) => {
                if (event.key === "Enter") onApplySourceCoordinates();
              }}
              placeholder="Click map or type..."
              className="w-full bg-transparent text-sm focus:outline-none placeholder:text-sidebar-foreground/30"
            />
          </div>
          <button
            type="button"
            onClick={onSelectSource}
            className={`mt-1 text-xs font-medium transition-colors ${
              selectionMode === "source"
                ? "text-sidebar-primary"
                : "text-sidebar-foreground/65 hover:text-sidebar-foreground"
            }`}
          >
            {selectionMode === "source"
              ? "Click map to set Source"
              : "Pick Source on Map"}
          </button>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Destination
          </label>
          <div
            className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2"
            onClick={onSelectDestination}
          >
            <Flag className="size-3.5 shrink-0 text-sidebar-primary" />
            <input
              type="text"
              value={destinationCoordinateInput}
              onChange={(event) =>
                onDestinationCoordinateInputChange(event.target.value)
              }
              onBlur={onApplyDestinationCoordinates}
              onKeyDown={(event) => {
                if (event.key === "Enter") onApplyDestinationCoordinates();
              }}
              placeholder="Click map or type..."
              className="w-full bg-transparent text-sm focus:outline-none placeholder:text-sidebar-foreground/30"
            />
          </div>
          <button
            type="button"
            onClick={onSelectDestination}
            className={`mt-1 text-xs font-medium transition-colors ${
              selectionMode === "destination"
                ? "text-sidebar-primary"
                : "text-sidebar-foreground/65 hover:text-sidebar-foreground"
            }`}
          >
            {selectionMode === "destination"
              ? "Click map to set Destination"
              : "Pick Destination on Map"}
          </button>
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudSun className="size-3.5 text-sidebar-foreground/50" />
              <span className="text-xs text-sidebar-foreground/50">
                Weather
              </span>
            </div>
            <span className="text-xs font-semibold text-sidebar-primary">
              {conditionBadge(weatherCondition)}
            </span>
          </div>
          <p className="text-xs text-sidebar-foreground/70">
            {weatherHeadline}
          </p>
          <p className="text-xs text-sidebar-foreground/55">{weatherDetail}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="size-3.5 text-sidebar-foreground/50" />
              <span className="text-xs text-sidebar-foreground/50">
                Traffic
              </span>
            </div>
            <span className="text-xs font-semibold text-sidebar-primary">
              Light
            </span>
          </div>
        </div>
      </div>

      {coordinateError ? (
        <p className="mx-6 mt-3 text-xs text-rose-300" role="alert">
          {coordinateError}
        </p>
      ) : null}

      <button
        onClick={onAnalyze}
        disabled={loading}
        className="mx-6 mt-4 w-auto rounded-lg bg-sidebar-primary py-2.5 text-sm font-semibold text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20 transition-all duration-200 hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Analyzing..." : "Analyze Routes"}
      </button>

      <div className="mt-8 grow px-6">
        <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          Saved Routes
        </h3>
        <div className="space-y-2">
          <div className="cursor-pointer rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2.5 transition-colors duration-200 hover:bg-sidebar-accent">
            <div className="text-sm font-medium">City to Mountains</div>
            <div className="text-xs text-sidebar-foreground/50">
              3.5 hrs · Score: 88%
            </div>
          </div>
          <div className="cursor-pointer rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2.5 transition-colors duration-200 hover:bg-sidebar-accent">
            <div className="text-sm font-medium">Coastal Express</div>
            <div className="text-xs text-sidebar-foreground/50">
              2.1 hrs · Score: 94%
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-sidebar-border p-6 pt-4">
        <button className="flex items-center gap-2 text-xs text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground">
          <Settings className="size-3.5" />
          Settings
        </button>
        <ThemeToggle />
      </div>
    </aside>
  );
}
