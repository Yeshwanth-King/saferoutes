# SafeRoute

SafeRoute is a Next.js application that analyzes road safety for route alternatives using:
- traffic level signals
- accident hotspot proximity
- live weather risk

It renders Google Maps route geometry, scores alternatives with explainable rules, and recommends the best route.

---

## 1) Product Summary

SafeRoute helps users choose safer routes between source and destination points. The app:
- lets users pick source/destination from map clicks or manual coordinates
- fetches live weather conditions through a server-side proxy
- fetches route geometry and turn steps through Google routing services
- computes safety scores and issues for each route
- highlights a recommended route and shows a textual summary

---

## 1.1) Challenge Vertical and Persona

- **Chosen vertical:** Mobility and commuter safety assistant
- **Primary persona:** Daily two-wheeler/car commuter in Bengaluru
- **Problem context:** Users often pick the fastest route, but that can increase exposure to accident-prone roads and poor weather visibility.
- **Assistant behavior:** Provide a practical safety-first recommendation with explainable reasoning, not just a shortest-path output.

---

## 1.2) Assumptions

- User has internet connectivity for map and weather APIs.
- User is traveling within areas where Google routing data is available.
- Accident hotspot weights are domain-provided heuristics and can be tuned.
- If live weather is unavailable, the system falls back to conservative clear-weather scoring and clearly communicates that fallback.

---

## 2) Core Features

- Interactive map source/destination selection
- Coordinate input fallback (`lat, lng`)
- Route fetching with provider fallback:
  - Google Directions API (primary)
  - Google Routes API (fallback)
- Route card scoring and risk labeling
- AI-style recommendation summary (rule-based text generation)
- Turn-by-turn directions panel for best route
- Dark/light theme toggle
- Development-only debug JSON payload

---

## 3) Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **UI:** Tailwind CSS v4 + custom CSS variables
- **Map & Routing:**
  - Google Maps JavaScript API
  - Google Directions API
  - Google Routes API
- **Weather:** OpenWeather API (proxied via server route)
- **Icons:** `lucide-react`
- **Testing:** Vitest
- **Linting:** ESLint
- **Containerization:** Docker (multi-stage build)

---

## 4) Project Architecture

### 4.1 Frontend Layer

- `app/page.tsx`
  - main orchestration/state container
  - holds source/destination/selection mode/weather/analysis state
  - composes `Sidebar`, `MapView`, `BottomPanel`, `AlertTicker`
- `components/Sidebar.tsx`
  - navigation-like panel
  - source/destination input + map-pick actions
  - weather/traffic status
  - analyze trigger
  - theme toggle
- `components/MapView.tsx`
  - loads Maps JS API
  - handles map-click point picking
  - fetches route candidates
  - draws/updates route polylines
  - fits viewport to all routes
- `components/BottomPanel.tsx`
  - AI summary + directions panel + route cards

### 4.2 Backend API Layer (Next Route Handlers)

- `app/api/weather/route.ts`
  - server-side weather proxy
  - supports One Call (if lat/lon configured)
  - falls back to Current Weather endpoint
- `app/api/maps/routes/route.ts`
  - validates origin/destination input
  - calls Directions API first
  - falls back to Routes API
  - returns normalized route payload

### 4.3 Shared Logic

- `lib/scoring.ts` for route scoring/issue generation
- `lib/weather.ts` for weather payload normalization and fallback behavior
- `lib/types.ts` for core route/weather type contracts

---

## 5) Data Flow (End-to-End)

1. User picks source/destination from map or coordinate input.
2. `MapView` requests route candidates from `POST /api/maps/routes`.
3. Backend tries Directions API, then Routes API if needed.
4. Candidate routes are decoded and passed back to frontend.
5. User clicks `Analyze Routes`.
6. `app/page.tsx` runs `analyzeRoutes(...)` with:
   - route candidates (or static fallback data)
   - current weather condition
   - accident hotspot map
7. UI updates:
   - best route highlighted on map and cards
   - issues and risk levels shown
   - summary and directions rendered

---

## 6) Scoring Model

From `lib/scoring.ts`:
- Traffic penalty:
  - `low`: 5
  - `medium`: 15
  - `high`: 30
- Weather penalty:
  - `clear`: 0
  - `rain`: 10
  - `heavy_rain`: 20
- Accident penalty:
  - sum of accident zone weights for each `passesThrough` area

Final score:
- `score = 100 - (trafficPenalty + weatherPenalty + accidentPenalty)`

Risk level:
- `safe` for score >= 80
- `moderate` for 50-79
- `risky` for < 50

Issue labels include:
- traffic severity
- accident-prone zones
- weather visibility warnings

---

## 7) Environment Variables

Create `.env.local`:

```bash
# Weather (server-preferred)
OPENWEATHER_API_KEY=your_openweather_key
OPENWEATHER_CITY=Bengaluru
OPENWEATHER_LAT=
OPENWEATHER_LON=

# Maps (server + browser)
GOOGLE_MAPS_API_KEY=your_google_server_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_browser_key
```

### Notes
- `GOOGLE_MAPS_API_KEY` should be safe for server-side use (IP-restricted or private backend use).
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is exposed to browser; use strict HTTP referrer restrictions.
- `OPENWEATHER_API_KEY` is server-only and recommended for security.

---

## 8) API Contracts

### 8.1 `GET /api/weather`

Purpose:
- proxy OpenWeather with normalized app-friendly response

Success response shape:

```json
{
  "condition": "clear",
  "cityName": "Bengaluru",
  "description": "Clear Sky",
  "headline": "☀️ Clear conditions — good visibility",
  "fromApi": true
}
```

Error responses:
- `503` when API key missing
- `502` on upstream/network/parse failures

### 8.2 `POST /api/maps/routes`

Request:

```json
{
  "origin": { "lat": 12.9352, "lng": 77.6245 },
  "destination": { "lat": 12.9698, "lng": 77.75 }
}
```

Success:

```json
{
  "routes": [
    {
      "encodedPolyline": "...",
      "durationSeconds": 1140,
      "distanceMeters": 5000,
      "summary": "Bannerghatta Rd",
      "directionsSteps": ["Head east", "Turn right ..."]
    }
  ],
  "provider": "directions"
}
```

Failure:
- `400` invalid body/input
- `500` missing Google API key
- `502` both providers failed, with short provider error details

---

## 9) Local Development

Install:

```bash
pnpm install
```

Run dev server:

```bash
pnpm dev
```

Lint:

```bash
pnpm lint
```

Run tests:

```bash
pnpm test
```

Watch tests:

```bash
pnpm test:watch
```

App URL:
- `http://localhost:3000`

---

## 10) Docker Deployment

This repo includes:
- `Dockerfile` (multi-stage build)
- `.dockerignore`

Prerequisites:
- Next config sets `output: "standalone"` (already configured in `next.config.ts`)

Build image:

```bash
docker build -t saferoute:latest .
```

Run container:

```bash
docker run -p 3000:3000 --env-file .env.local saferoute:latest
```

---

## 11) Cloud Deployment Notes

- Ensure all required env vars are configured in host platform.
- Keep browser key and server key restrictions separate.
- If hosted behind a proxy/CDN, ensure referrer restrictions still match deployed domain.
- For Cloud Run, store server keys in Secret Manager and mount/inject them as runtime secrets.

---

## 11.1) Google Services Used

- **Google Maps JavaScript API:** interactive map rendering and user point selection.
- **Google Directions API:** primary route provider (including maneuver text for directions panel).
- **Google Routes API:** fallback route provider to improve resilience.
- **Google Cloud Run (deployment target):** containerized production hosting.

This usage is intentional: it combines map visualization, route intelligence, provider fallback reliability, and cloud-native deployment.

---

## 12) Troubleshooting

### Map blank or no routes shown
- Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` exists and Maps JavaScript API is enabled.
- Check Google Cloud project has Directions API and/or Routes API enabled.
- Ensure source and destination are valid coordinates.

### Analyze clears map unexpectedly
- Fixed by preventing map re-initialization on route updates in `MapView`.
- If behavior appears stale during development, hard refresh browser.

### Weather always clear fallback
- Check `OPENWEATHER_API_KEY`.
- Confirm city name (`OPENWEATHER_CITY`) is valid.
- If using One Call, set both `OPENWEATHER_LAT` and `OPENWEATHER_LON`.

### Google Maps warning about Marker deprecation
- Current implementation uses `google.maps.Marker`.
- Warning is informational for now; migration path is `AdvancedMarkerElement`.

---

## 13) Security Considerations

- Weather key is consumed server-side via API route (recommended).
- Client receives normalized weather data, not raw secret keys.
- API route errors are sanitized.
- Debug JSON panel is hidden in production.

---

## 14) Important Files

- `app/page.tsx` - main app state and orchestration
- `components/MapView.tsx` - map rendering and route drawing pipeline
- `components/Sidebar.tsx` - controls, coordinate input, map-pick actions
- `components/BottomPanel.tsx` - summary/directions/cards output
- `app/api/maps/routes/route.ts` - route provider backend logic
- `app/api/weather/route.ts` - weather proxy backend logic
- `lib/scoring.ts` - safety scoring rules
- `lib/weather.ts` - weather parsing and fallbacks
- `lib/types.ts` - domain types
- `Dockerfile` - production container build
- `.dockerignore` - docker build context optimization

---

## 15) License / Ownership

Add your preferred license and ownership metadata here if this project is being shared publicly.

---

## 16) Submission Compliance Checklist

- [x] Public GitHub repository
- [x] Single branch repository (`main`)
- [x] Repository tracked file size under 1 MB
- [x] README includes vertical, approach, logic, assumptions, and run steps
- [x] Google services integration is explicit and meaningful
- [x] Security-conscious API key handling documented
