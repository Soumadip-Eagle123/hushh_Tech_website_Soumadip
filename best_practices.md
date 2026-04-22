# Hushh Signalkeeper PR Review Best Practices

Use these rules to keep reviews high-signal, production-focused, and quiet by default.

## Reviewer posture

- Treat the agent as the first production reviewer, not a summarizer or merge bot.
- Prefer a short list of high-confidence findings over exhaustive commentary.
- Do not file style, naming, formatting, or optional refactor comments unless they directly hide a defect.
- Each finding should name the file, the concrete failure mode, why it matters in production, and the missing guardrail or test.

## Protect deployment and release safety

Pattern: deploy changes must stay gated to approved, smoke-green `main` SHAs only.

- Pull request workflows must not deploy to UAT or production.
- Treat workflow, release, and environment-scope edits as high risk.
- Flag any weakened SHA provenance, branch gating, smoke gating, or approval requirements.

## Preserve the environment contract

Pattern: a newly required variable is not complete until it is wired end-to-end.

- New required environment variables must be reflected in `.env.local.example`, `src/vite-env.d.ts`, `scripts/ci/env-contract.json`, and relevant workflows.
- Critical server-side env usage in API routes must also be injected in governed deploy workflows.
- Missing env wiring is a correctness issue, not a docs-only issue.

## Keep secrets out of browser code

Pattern: `VITE_*` is for intentionally public values only.

- Browser-visible `VITE_*` variables must never expose production-only vendor secrets.
- `VITE_ALLOW_INSECURE_BROWSER_LLM` must stay `false` in CI, UAT, and production paths.
- Sensitive credentials belong in server runtime config or GCP Secret Manager, not committed files, browser env, or client bundles.

## Review auth, API, and privileged data paths defensively

Pattern: risky routes must validate input, fail closed, and avoid privilege expansion.

- API routes should validate inputs, fail closed on missing secrets, and avoid leaking internal errors.
- Changes touching auth, sessions, account deletion, notifications, metrics, or Supabase service-role usage need especially careful review.
- Flag request handlers that silently weaken authorization, tenant scoping, or failure handling.

## Do not weaken required verification

Pattern: required checks stay blocking and representative of production.

- `npm ci`, tests, TypeScript validation, env contract checks, lint checks, secret scanning, and security audit reporting must remain intact.
- Do not swallow failures with `|| true`, `|| echo`, `continue-on-error`, or other non-blocking fallbacks on required validation jobs.
- `npm run build:web` is the authoritative production build path because it refreshes generated assets before bundling.

## Require proof on risky changes

Pattern: high-risk behavior changes need executable evidence.

- If auth, API, env, CI, or deploy behavior changes without tests or smoke coverage, call that out.
- Prefer findings tied to user impact, security impact, deploy risk, or operational regression.
