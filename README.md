# EcoShield — Multi-Hazard Disaster Intelligence Platform

> 🌐 **Live Production Deployment**: [https://ecoshield-xi.vercel.app](https://ecoshield-xi.vercel.app)

A responsive Kerala emergency-operations platform built with React, Vite, Tailwind CSS, Leaflet/OpenStreetMap, Recharts, and automated multi-hazard fusion telemetry. No paid LLM is required. Caches public feeds and protects satellite feeds with zero-configuration open fallbacks.

## Run locally

Requires Node.js 22.12+ (or 20+).

```sh
npm install
cp .env.example .env
# Optional: Set FIRMS_MAP_KEY in .env (if omitted, automatically falls back to open NASA Near-Real-Time feed)
npm run dev
```

On Windows: `Copy-Item .env.example .env`.

```sh
npm test          # Run 10 automated engine and telemetry unit tests
npm run build     # Compiles client (dist/client) and bundled worker (dist/server)
npm start         # Starts production server on http://0.0.0.0:3000
```

---

## 🚀 Hosting & Production Deployment

EcoShield is architected for zero-configuration, production-grade deployment across all major hosting platforms. Static assets (`dist/client`) and environmental intelligence APIs (`/api/*`) work out of the box with zero runtime database requirements.

### Option 1: Docker & Container Platforms (Cloud Run, Render, Railway, Fly.io, AWS ECS)

A multi-stage `Dockerfile` and `docker-compose.yml` are included.

**Run with Docker:**
```sh
# Build the container
docker build -t ecoshield .

# Run the container (binds to port 3000)
docker run -d -p 3000:3000 --name ecoshield-prod ecoshield
```

**Run with Docker Compose:**
```sh
docker compose up -d
```
The platform will be live at `http://localhost:3000` with active container healthchecks at `/healthz`.

- **Google Cloud Run**: Run `gcloud run deploy ecoshield --source . --port 3000 --allow-unauthenticated`
- **Render / Railway / Fly.io**: Connect your Git repository. The platform automatically detects the `Dockerfile` and provisions the container with the `PORT` environment variable.

---

### Option 2: Cloudflare Workers & Pages

EcoShield includes a fully configured `wrangler.toml` pointing to the pre-bundled Worker (`dist/server/index.js`) and static client directory (`dist/client`).

```sh
# 1. Install Wrangler CLI
npm install -g wrangler

# 2. Authenticate
wrangler login

# 3. Build & Deploy
npm run build
wrangler deploy
```

*(Optional) Configure your NASA FIRMS secret if you have a private key:*
```sh
wrangler secret put FIRMS_MAP_KEY
```

---

### Option 3: Vercel (1-Click Deployment)

EcoShield includes native `vercel.json` and a serverless entrypoint in `api/index.js`.

```sh
# Install Vercel CLI & deploy
npm install -g vercel
vercel
```
Or import the repository directly into your [Vercel Dashboard](https://vercel.com/new). Vercel will automatically run `npm run build` and route `/api/*` to the serverless function and all other routes to static `dist/client`.

---

### Option 4: Netlify

Includes `netlify.toml` and serverless API routing via `netlify/functions/api.js`.

```sh
# Install Netlify CLI & deploy
npm install -g netlify-cli
netlify deploy --build --prod
```
Or connect your GitHub repository in the Netlify Dashboard.

---

### Option 5: Standard Linux VPS (Ubuntu / Debian / CentOS with PM2 / systemd)

For standalone Ubuntu/Debian droplets or dedicated servers:

```sh
# 1. Install PM2 process manager
npm install -g pm2

# 2. Build assets and launch cluster
npm run build
pm2 start ecosystem.config.cjs

# 3. Save startup configuration
pm2 save
pm2 startup
```

Configure Nginx reverse proxy to forward traffic to `http://127.0.0.1:3000` with container/orchestrator health probe at `http://127.0.0.1:3000/healthz`.

---

## Demo walkthrough

1. Open **Command center** to see the Kerala hazard map, 7 monitoring locations, live connection status, individual risks, fusion and current environmental values.
2. Choose **Demo scenario** for a visibly labelled fictional monsoon incident. This changes hazard inputs, not the connection status table.
3. Select a map marker or a **Hazard intelligence** location, then **Explain risk** for raw inputs, weights, contribution points and input coverage.
4. **Eco-AI response → Why this recommendation?** connects each readiness recommendation to deterministic risk signals.
5. **Resource allocation** ranks locations, caps assignments at demo inventory and shows unmet demand. Export produces a local text plan; no dispatch happens.
6. **Incident replay** plays seven stages, with pause, reset and scrubbing. The replay uses simulated values only.
7. **Alert center → Send test alert** shows a local notification. SMS and sirens are simulated; there is no messaging integration.
8. **Sensor network** provides 21 labelled simulated ESP32/LoRa nodes (20 online, one offline), updating every 15 seconds.
9. **Data sources** shows the actual status, classifications, source links and limitations.

## Data integrity

| Feed | Classification | Notes |
|---|---|---|
| Open-Meteo weather | MODELLED | Current conditions, hourly precipitation, 72-hour history, 24-hour forecast and 9–27 cm soil moisture |
| GloFAS through Open-Meteo | MODELLED | Daily river discharge; baseline is the previous 14 complete days, not climatology |
| NASA FIRMS NOAA-20 VIIRS | LIVE | Near-real-time satellite thermal detections over a padded Kerala/border bounding box during the previous 3 days; repeated passes may see the same fire |
| CAMS global through Open-Meteo | MODELLED | US and European AQI, PM2.5, PM10, CO, NO₂ and O₃; not India AQI or a local air monitor |
| Copernicus GLO-90 through Open-Meteo | OFFICIAL REFERENCE DATA | Elevation; derived slope uses 5 neighbouring points and is MODELLED |
| GSI Bhusanket | OFFICIAL REFERENCE DATA | Official Kerala susceptibility image available as a reference; no georeferenced polygons or point classifications integrated |
| IoT, exposure, shelters, resources, replay | SIMULATED PROTOTYPE DATA | Always labelled, including when current environmental feeds are selected |

Soil moisture is volumetric water content in m³/m³, **not percent saturation**. Rainfall aggregates use complete hourly windows and preserve missing inputs. A missing provider never becomes a fake live reading. Weather retrieval failure automatically enters a clearly labelled **DEMO DATA** mode. Other missing feeds remain unavailable, and scores display partial input coverage. Manual refresh and 10-minute polling retrieve API data; the server cache lasts 15 minutes. Retrieval timestamps and validity timestamps are distinct.

The map shows monitoring points and illustrative rainfall circles, **not validated hazard extents**. The GSI published image is not stretched into a geographic overlay. GloFAS (~5 km) may select a different river grid locally; CAMS global (~45 km) does not resolve streets. Slope is a coarse neighbourhood estimate, not surveyed terrain. NASA thermal anomalies are not necessarily confirmed wildfires. Wind-favoured exposure is `(wind-from + 180) % 360`; it is not an exact fire-propagation model.

## Explainable risk logic

`N(x,t) = clamp(x/t,0,1)`. Each score is `100 × sum(N × available weight) / sum(available weight)`. Below 60% input coverage, no score is assigned. Missing data never count as zero. Weights and thresholds are prototype assumptions, not validated operational warning thresholds.

- Flood: hourly rain 10% (20 mm), 24-hour rain 20% (100 mm), 72-hour rain 20% (250 mm), VWC 15% (0.45), positive discharge rise 20% (2 × baseline rise), forecast 24-hour rain 15% (100 mm).
- Landslide: hourly rain 15% (20 mm), 24-hour rain 25% (100 mm), 72-hour rain 20% (250 mm), VWC 20% (0.45), slope 15% (30°), susceptibility 5% (index 1). Susceptibility is unavailable in current-feed mode and explicitly assumed only in the simulation.
- Fire weather: temperature above 20°C 25% (20°C excess), dryness 30% (80% humidity deficit), wind 25% (45 km/h), nearby thermal detections 20% (3 within 30 km).
- Fusion: `min(100, highest + .15 × second + .05 × third)`. At least 2 available hazard scores are required. Compound risk means at least 2 hazards reach 55. Shared rainfall/soil signals are not added again as independent hazards; correlation is still a limitation of this heuristic.
- Classes: 0–29 LOW, 30–54 MODERATE, 55–74 HIGH, 75–100 CRITICAL.
- Resources: severity 70%, simulated exposure 20%, inverse straight-line distance from Kochi 10%. Allocation is sequential within fixed inventory, with capacity gaps shown explicitly. Distances are not routes or travel times.

## Region architecture

`src/regions.js` owns region metadata, locations and demo inventory. Add a region configuration and extend the region selector and fixed-source server routing to expand beyond Kerala. The current app intentionally enables Kerala only. The UI offers command center, hazards, sensors, alerts, resources, replay and sources views; no database or login is needed for local operation.

## Verification

Eight automated checks cover class boundaries, null preservation, complete rainfall windows, partial-input explanations, replay consistency, demo date validity, inventory conservation, sensor states and FIRMS parsing. Test messages and allocations are local and reversible.

**EcoShield is a hackathon prototype. Hazard risk scores and response recommendations are decision-support outputs and should not replace official emergency-management warnings.**

## Primary references and attribution

- [Open-Meteo weather](https://open-meteo.com/en/docs), [flood](https://open-meteo.com/en/docs/flood-api), [air quality](https://open-meteo.com/en/docs/air-quality-api), [elevation](https://open-meteo.com/en/docs/elevation-api)
- [NASA FIRMS Area API](https://firms.modaps.eosdis.nasa.gov/api/area/)
- [GSI Bhusanket](https://bhusanket.gsi.gov.in/), [Kerala reference map](https://bhusanket.gsi.gov.in/pics/Susceptibility/Kerala.png)
- [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)

Open-Meteo, Copernicus/CAMS/GloFAS, NASA FIRMS and GSI retain their respective attribution and usage terms. No third-party dataset has been represented as an official warning issued by EcoShield.
