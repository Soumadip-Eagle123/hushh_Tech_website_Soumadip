---
name: frontend-design-system
description: Use when a contributor PR changes shared Hushhtech UI primitives, shell chrome, theme behavior, or reusable visual patterns.
---

# Hushhtech Frontend Design System Skill

## Purpose and Trigger

- Primary scope: `frontend-design-system`
- Trigger on shared UI primitives, shell-chrome rules, design-system policy, and reusable Hushhtech visual patterns.
- Avoid overlap with `frontend` and `repo-operations`.

## Coverage and Ownership

- Role: `spoke`
- Owner family: `frontend`

Owned repo surfaces:

1. `src/components/ui`
2. `src/components/hushh-tech-back-header`
3. `src/components/hushh-tech-cta`
4. `src/components/hushh-tech-faq-sheet`
5. `src/components/hushh-tech-footer`
6. `src/components/hushh-tech-header`
7. `src/components/hushh-tech-nav-drawer`
8. `src/theme`
9. `docs/reference/quality/design-system.md`

Non-owned surfaces:

1. `frontend`
2. `quality-contracts`
3. `security-audit`

## Do Use

1. Shared component and shell-chrome fixes during patch-and-merge review.
2. Reusable route-header, nav, footer, and common visual treatment corrections.
3. Design-system policy updates that support contributor review flow.

## Do Not Use

1. Broad page-level product logic fixes where a shared pattern is not changing.
2. CI pipeline debugging.
3. Security review as the main concern.

## Read First

1. `docs/reference/quality/design-system.md`
2. `package.json`

## Workflow

1. Decide whether the regression is shared or route-local.
2. Patch shared UI only when the change is clearly reusable and bounded.
3. Keep the patch consistent with the tracked design-system reference and existing shared components.

## Handoff Rules

1. Route route-local implementation back to `frontend`.
2. Route final PR bucket selection back to `oss-contribution-triage`.
3. Route proof selection to `quality-contracts`.
4. Route security-sensitive UI behavior to `security-audit`.

## Required Checks

```bash
npm test
npx tsc --noEmit
npm run build:web
```
