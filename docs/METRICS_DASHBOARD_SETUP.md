# Metrics Reporting Setup

This runbook reflects the rebuilt KPI system at `https://hushhtech.com/metrics`.

Developer implementation handoff: `docs/HASHTAG_ANALYTICS_DEVELOPER_HANDOFF.md`.

## Architecture

- Primary truth source: website Supabase business funnel
  - `auth.users` signups
  - `public.users` persisted users
  - `onboarding_data` started and completed onboarding
  - `investor_profiles` created and confirmed profiles
- First-party website analytics in Supabase
  - `site_analytics_sessions`
  - `site_analytics_events`
  - sanitized page views, sessions, search, CTA, onboarding, KYC, profile, chat, wallet, and privacy events
- Secondary context: GA4 traffic
  - DAU / WAU / MAU
  - sessions, engaged sessions, views, new users, engagement, average session duration
- Search visibility context: Google Search Console
  - clicks, impressions, CTR, average position
  - public-safe top queries, pages, countries, devices, and search appearance
  - state/region is sourced from GA4 because Search Console does not expose state
- GCP Cloud Run / Monitoring context
  - configured services, request count, error rate, p95 latency, instance count, and availability-style success ratio
- Separate appendix: legacy `hushh-api` profile flow
  - never merged into the main website funnel totals
- Public interfaces:
  - `GET /api/metrics/summary?window_days=7`
  - `POST /api/analytics/collect`
  - `POST /api/metrics/send-report`
  - `/metrics`

## Current Audit Findings

- Website stack:
  - Cloud Run service: `hushh-tech-website`
  - Supabase project: `ibsisfnjxeowvdtvgzff`
- Legacy profile stack:
  - Cloud Run service: `hushh-api`
  - Supabase project: `rpmzykoxqnbozgdoqbpc`
- The website and legacy systems are separate in production today.
- `/user-registration` still posts to legacy `hushh-api`.
- `/your-profile` still reads from legacy `check-user`.
- The public dashboard must keep those legacy numbers explicitly separate.

## Required Runtime Config

### Required for the business funnel

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Without these, `/api/metrics/summary` intentionally fails fast.

### Required for first-party analytics collection

- `ANALYTICS_HASH_SALT`

Without this, `POST /api/analytics/collect` intentionally fails closed so visitor, session, IP, and user-agent hashes are never generated with an empty salt.

### Optional for the legacy appendix

- `LEGACY_SUPABASE_URL`
- `LEGACY_SUPABASE_SERVICE_ROLE_KEY`

If these are missing, the summary still works and returns a warning that the legacy appendix is unavailable.

### Optional for GA traffic context

- `GA4_PROPERTY_ID`
- `GA4_ALLOWED_HOSTNAMES`
- `LOOKER_STUDIO_EMBED_URL`
- `GCP_MONITORING_PROJECT_ID`
- `GCP_CLOUD_RUN_REGION`
- `GCP_CLOUD_RUN_SERVICES`
- `SEARCH_CONSOLE_SITE_URL`
  - example: `sc-domain:hushhtech.com` or `https://www.hushhtech.com/`
- `SEARCH_CONSOLE_TYPE`
  - default: `web`
- `SEARCH_CONSOLE_DATA_STATE`
  - default: `all`
- `SEARCH_CONSOLE_ROW_LIMIT`
  - default: `25`

GA traffic is additive context only. The KPI totals do not depend on Looker.
GCP Monitoring metrics are additive context only. The public endpoint returns warnings when Cloud Monitoring is not configured or the Cloud Run service account does not have Monitoring Viewer access.
Search Console metrics are additive SEO context only. They are not true realtime clickstream data; `SEARCH_CONSOLE_DATA_STATE=all` asks Google for the freshest available Search Analytics data, and recent rows can still be incomplete.

### Optional for the daily report

- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `METRICS_REPORT_RECIPIENTS`
  - default: `ankit@hushh.ai`
- `METRICS_REPORT_TIMEZONE`
  - default: `America/Los_Angeles`
- `METRICS_REPORT_SCHEDULE`
  - example: `0 8 * * *`
- `METRICS_REPORT_FROM_EMAIL`
  - optional override for the sender address
- `METRICS_REPORT_SHARED_SECRET`
  - required in production to call `POST /api/metrics/send-report`

## Secret Manager Recommendations

Create these secrets in `hushh-tech-prod`:

- `hushh-tech-metrics-ga4-property-id`
- `hushh-tech-metrics-ga4-allowed-hostnames`
- `hushh-tech-metrics-looker-studio-embed-url`
- `hushh-tech-legacy-supabase-service-role-key`
- `hushh-tech-metrics-report-shared-secret`
- `hushh-tech-supabase-service-role-key`
- `hushh-tech-analytics-hash-salt`

Recommended Cloud Run secret bindings:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GA4_PROPERTY_ID`
- `GA4_ALLOWED_HOSTNAMES`
- `LOOKER_STUDIO_EMBED_URL`
- `LEGACY_SUPABASE_SERVICE_ROLE_KEY`
- `METRICS_REPORT_SHARED_SECRET`
- `ANALYTICS_HASH_SALT`

Search Console does not use a secret env value when Cloud Run Application Default Credentials are used. The Cloud Run runtime service account must have Search Console access to the configured property, and `searchconsole.googleapis.com` must be enabled in the GCP project.

Do not keep `SUPABASE_SERVICE_ROLE_KEY` as a literal Cloud Run environment value. Store it in Secret Manager, bind it into Cloud Run at runtime, and rotate the Supabase service-role key during a controlled deployment window.

## Daily Report Flow

The daily email uses the same summary payload as the dashboard.

1. Cloud Scheduler calls `POST /api/metrics/send-report`
2. The request includes `Authorization: Bearer <METRICS_REPORT_SHARED_SECRET>`
3. The route builds the same 7-day summary used by `/metrics`
4. The route sends the HTML email through Gmail SMTP

### Dry-run example

```bash
curl -X POST \
  "https://hushhtech.com/api/metrics/send-report?preview=1" \
  -H "Authorization: Bearer $METRICS_REPORT_SHARED_SECRET"
```

### Scheduler example

```bash
gcloud scheduler jobs create http hushh-metrics-report \
  --project hushh-tech-prod \
  --location us-central1 \
  --schedule "0 8 * * *" \
  --time-zone "America/Los_Angeles" \
  --uri "https://hushhtech.com/api/metrics/send-report" \
  --http-method POST \
  --headers "Authorization=Bearer ${METRICS_REPORT_SHARED_SECRET},Content-Type=application/json" \
  --message-body '{"windowDays":7}'
```

## Smoke Checks

### Dashboard

- Open `/metrics`
- Confirm the page is public and does not redirect to login
- Confirm `X-Robots-Tag: noindex, nofollow`
- Confirm the hero copy says business funnel first and traffic second
- Confirm the page renders KPI cards without depending on an embedded Looker iframe

### Summary API

- `GET /api/metrics/summary?window_days=7`
- Confirm payload includes:
  - `generatedAt`
  - `timezone`
  - `window`
  - `businessFunnel`
  - `audience`
  - `search`
  - `activity`
  - `funnels`
  - `dropoff`
  - `traffic`
  - `gcp`
  - `systemHealth`
  - `dataCoverage`
  - `legacy`
  - `dataQualityWarnings`
- Confirm `businessFunnel` and `legacy` are separated
- Confirm no raw event rows, user IDs, emails, IPs, full user agents, raw search text, prompts, tokens, or Plaid data are returned

### Report API

- `POST /api/metrics/send-report?preview=1`
- Confirm the preview returns:
  - `subject`
  - `html`
  - `summary`
- Then run a real send only after preview looks correct

## Important Notes

- Looker Studio is now optional. It is not the KPI source of truth.
- Schema drift is surfaced in `dataQualityWarnings` and in the report email instead of being hidden.
- If live runtime tables differ from repo migrations, live runtime behavior wins for KPI generation and the mismatch is reported.
