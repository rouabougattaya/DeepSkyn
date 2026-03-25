# DEV4 — Skin Age Insights Integration

## Architecture
- Backend module: insights layer now exposes a dedicated skin-age controller and service reusing existing metrics pipeline ([backend/src/insights/skin-age.controller.ts](backend/src/insights/skin-age.controller.ts), [backend/src/insights/skin-age-insights.service.ts](backend/src/insights/skin-age-insights.service.ts)).
- Data source: demo dataset used for benchmarks ([backend/data/skin_analysis_dataset.csv](backend/data/skin_analysis_dataset.csv)), plus live analyses from the skinAnalysis table via [backend/src/skinMetric/skin-metric.service.ts](backend/src/skinMetric/skin-metric.service.ts).
- Frontend: dashboard consumes the new endpoint through a thin service and renders a dedicated card component ([frontend/src/services/skinAgeInsightsService.ts](frontend/src/services/skinAgeInsightsService.ts), [frontend/src/components/insights/SkinAgeInsightCard.tsx](frontend/src/components/insights/SkinAgeInsightCard.tsx), [frontend/src/pages/DashboardPage.tsx](frontend/src/pages/DashboardPage.tsx)).

## Backend logic
- Endpoint: `GET /skin-age/insights/:userId` guarded by JWT; rejects cross-user access in [backend/src/insights/skin-age.controller.ts](backend/src/insights/skin-age.controller.ts).
- Insight engine: [backend/src/insights/skin-age-insights.service.ts](backend/src/insights/skin-age-insights.service.ts) computes
  - Delta skinAge vs realAge on latest analysis, trend average on last 5 analyses (`getUserSkinAgeSeries`).
  - Status buckets (`younger`, `aligned`, `older`, `unknown`) and guidance (headline, advice, product suggestions).
  - Dataset benchmarks (average skin age, real age, delta) loaded once from CSV for context.
- Metrics access: [backend/src/skinMetric/skin-metric.service.ts](backend/src/skinMetric/skin-metric.service.ts) now exposes `getUserSkinAgeSeries` selecting `skinAge`, `realAge`, `skinScore`, `createdAt` in descending order.

## Frontend logic
- Data fetcher: [frontend/src/services/skinAgeInsightsService.ts](frontend/src/services/skinAgeInsightsService.ts) calls the new endpoint.
- UI: [frontend/src/components/insights/SkinAgeInsightCard.tsx](frontend/src/components/insights/SkinAgeInsightCard.tsx) shows status pill, delta, dataset benchmarks, advice, product suggestions, and CTA buttons to run an analysis or view history.
- Integration: [frontend/src/pages/DashboardPage.tsx](frontend/src/pages/DashboardPage.tsx) loads skin-age insights alongside existing KPIs and renders the card in the main dashboard column with a refresh control.

## Usage
1) Authenticate, then call `GET /skin-age/insights/{userId}` with the connected user ID.
2) In the dashboard, the “Skin Age Insights” card displays the latest delta, guidance, and quick links to launch a new analysis or open history.
3) Dataset benchmarks appear under the card to contextualize the user’s position vs the sample set.
