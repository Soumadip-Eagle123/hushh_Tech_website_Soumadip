# CI Governance

This document describes the current Hushhtech PR and deploy lanes that the OSS contribution triage skill should trust.

## PR lanes

### `Signalkeeper Preflight`

- file: `.github/workflows/pr-intake.yml`
- trigger: `pull_request_target`
- purpose: always-visible sticky walkthrough and PR check guidance that still runs when `PR Validation` is waiting on fork approval or blocked by merge conflicts

### `Hushh Signalkeeper`

- file: `.github/workflows/pr-agent.yml`
- trigger: `pull_request_target` on `opened`, `synchronize`, `reopened`, and `ready_for_review`, plus trusted `issue_comment` slash-command follow-up on the PR thread
- purpose: first automated code review before maintainer review

Trusted maintainers can also use manual follow-up commands on the PR thread:

1. `/review` for a fresh review pass
2. `/compliance` for checklist- and security-oriented Qodo compliance analysis
3. `/checks` for CI feedback summarization

### `Semantic PR Guard`

- file: `.github/workflows/ci.yml`
- trigger: `pull_request`
- purpose: warning-first semantic policy lane for traceability, deploy disclosure, auth/security narrative, and targeted proof expectations

### `Reviewer Context & Compliance`

- file: `.github/workflows/ci.yml`
- trigger: `pull_request`
- purpose: blocking policy lane that verifies `Hushh Signalkeeper` is grounded by `.pr_agent.toml`, `AGENTS.md`, `QODO.MD`, `.ai_config.toml`, `best_practices.md`, `docs/project_context_map.md`, and the repo-root `pr_compliance_checklist.yaml`

### `PR Validation`

- file: `.github/workflows/ci.yml`
- trigger: `pull_request`
- purpose: authoritative pre-merge code-executing checks against the PR merge result

`Signalkeeper Preflight` and `Hushh Signalkeeper` are advisory `pull_request_target` lanes. They explain the PR state, publish the sticky walkthrough, and produce first-pass review output without executing contributor code. `Semantic PR Guard` is the first advisory `pull_request` lane inside `PR Validation`: it executes against the merge result, but it is currently warning-first and is not part of the blocking gate. `Reviewer Context & Compliance` is a blocking `pull_request` policy lane inside `PR Validation`: it verifies that the live reviewer and repo policy sources exist, parse, and are wired into `.pr_agent.toml`. `PR Validation` remains the authoritative code-executing surface that contributors and maintainers should treat as the actual pre-merge merge-authority lane.

Current `PR Validation` check surface:

1. `DCO`
2. `Secret Scan`
3. `Env Contract Check`
4. `Reviewer Context & Compliance`
5. `PR Hygiene`
6. `Semantic PR Guard` (advisory-first; not yet in `CI Status Gate`)
7. `Web Validation`
8. `Lint`
9. `Security Audit`
10. `CI Status Gate`

## Queue and post-merge lanes

### `Queue Validation`

- file: `.github/workflows/queue-validation.yml`
- trigger: `merge_group`
- purpose: authoritative freshness-at-merge-time validation

### `Main Post-Merge Smoke`

- file: `.github/workflows/main-post-merge-smoke.yml`
- trigger: `push` to `main`
- purpose: post-merge deploy-eligibility proof on landed `main` SHA

## Deploy lanes

### `Deploy to UAT`

- file: `.github/workflows/deploy-uat.yml`
- trigger: successful `Main Post-Merge Smoke` via `workflow_run`, plus optional manual dispatch with `sha`
- purpose: UAT promotion from a green `main` SHA

### `Deploy to PROD`

- file: `.github/workflows/deploy-prod.yml`
- purpose: manual promotion from an approved green `main` SHA

### `Deploy Email Template API`

- file: `.github/workflows/deploy-cloud-run.yml`
- trigger: `push` to `main` for `cloud-run/email-template-api/**`, plus manual dispatch
- purpose: standalone Cloud Run deployment for the email-template API surface

## Triage implications

1. `Signalkeeper Preflight` is explanatory, not merge authority.
2. `Hushh Signalkeeper` is an input, not merge authority.
3. `Semantic PR Guard` is the progressive-enforcement lane. Start new semantic checks here as advisory, and promote only the ones that prove high signal into the blocking gate later.
4. `PR Validation` is the main pre-merge code-executing check surface, and its aggregate branch-protection signal is `CI Status Gate`.
5. GitHub runs `pull_request` workflows from the PR merge branch, so merge-conflicted PRs will not show `PR Validation` until the conflicts are resolved.
6. For fork PRs, a maintainer may still need to approve code-executing workflows before the full `PR Validation` story is visible.
7. `Queue Validation` matters for freshness and merge authority, not contributor patch review.
8. `Main Post-Merge Smoke` gates the automatic UAT promotion path for the website lane, while `Deploy Email Template API` is a separate main-branch service deploy lane.
9. If `Reviewer Context & Compliance` fails, treat `Hushh Signalkeeper` output as ungrounded until `.pr_agent.toml`, the repo-root metadata files, or `pr_compliance_checklist.yaml` are repaired on `main`.
