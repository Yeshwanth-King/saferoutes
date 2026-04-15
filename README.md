# SafeRoute

SafeRoute is an AI-assisted route safety analyzer for Bengaluru. It compares route candidates using traffic, weather, and accident hotspot signals, then recommends the safest option with an explainable score.

## Features

- Live route geometry from Google APIs (`/api/maps/routes`)
- Live weather risk from OpenWeather (`/api/weather`)
- Rule-based route scoring and issue labels
- Accessibility-aware UI with keyboard coordinate entry fallback
- Development-only debug payload (hidden in production)

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Google Maps JavaScript API + Directions API + Routes API
- OpenWeather API
- Vitest for unit/API testing

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
OPENWEATHER_API_KEY=your_openweather_server_key
OPENWEATHER_CITY=Bengaluru
GOOGLE_MAPS_API_KEY=your_google_server_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_browser_key
```

3. Start the app:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Google Cloud Requirements

Enable these APIs in the same GCP project:

- Maps JavaScript API
- Directions API
- Routes API

Use separate key restrictions:

- `GOOGLE_MAPS_API_KEY` (server): IP restriction or server-side usage only
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (browser): HTTP referrer restriction

## Security Notes

- OpenWeather is fetched via server proxy (`/api/weather`) to avoid exposing private keys.
- External API failures return sanitized error details.
- Debug JSON payload is rendered only in non-production environments.

## Testing

Run lint:

```bash
npm run lint
```

Run tests:

```bash
npm run test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Cloud Run Deployment (Example)

1. Build and submit container:

```bash
gcloud builds submit --tag gcr.io/<PROJECT_ID>/saferoute
```

2. Deploy to Cloud Run:

```bash
gcloud run deploy saferoute \
  --image gcr.io/<PROJECT_ID>/saferoute \
  --platform managed \
  --region <REGION> \
  --allow-unauthenticated \
  --set-env-vars OPENWEATHER_CITY=Bengaluru \
  --set-secrets OPENWEATHER_API_KEY=OPENWEATHER_API_KEY:latest \
  --set-secrets GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest
```

3. Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` as a non-secret environment variable (browser key with strict referrer restrictions).

## Project Structure

- `app/page.tsx`: Main UI state and orchestration
- `components/MapView.tsx`: Map rendering and route retrieval pipeline
- `app/api/maps/routes/route.ts`: Google route provider proxy/fallback
- `app/api/weather/route.ts`: OpenWeather server proxy
- `lib/scoring.ts`: Route scoring logic
