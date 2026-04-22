---
name: frontend
description: Use when a contributor PR touches Hushhtech web pages, components, hooks, or frontend services and the correct narrower frontend spoke is not yet obvious.
---

# Hushhtech Frontend Skill

## Purpose and Trigger

- Primary scope: `frontend-intake`
- Trigger on broad frontend PR review, UI bug fixes, route behavior, component behavior, and frontend-owned patch-and-merge work.
- Avoid overlap with `frontend-design-system`, `security-audit`, and `repo-operations`.

## Coverage and Ownership

- Role: `owner`
- Owner family: `frontend`

Owned repo surfaces:

1. `src`
2. `public`

Non-owned surfaces:

1. `frontend-design-system`
2. `quality-contracts`
3. `security-audit`
4. `repo-operations`

## Do Use

1. Broad frontend intake when a contributor PR is directionally correct and needs a bounded patch.
2. Route behavior, component logic, and page-level frontend review.
3. Determining whether a fix is frontend-local or needs a shared design-system handoff.
4. Acting as the default owner for unmapped `src/**` and `public/**` contributions.

## Do Not Use

1. Shared UI ownership changes when the issue is clearly a design-system concern.
2. Pure CI or workflow debugging.
3. Auth/env/secret risk review as the primary task.

## Read First

1. `src/App.tsx`
2. `docs/project_context_map.md`
3. `docs/reference/quality/design-system.md`
4. `package.json`

## Workflow

1. Bound the user-facing regression first.
2. Keep route behavior and component behavior aligned with the same proof surface.
3. Hand shared UI ownership to `frontend-design-system` when the fix changes a reusable pattern.

## Handoff Rules

1. Route shared UI or shell-chrome ownership to `frontend-design-system`.
2. Route final PR bucket selection back to `oss-contribution-triage`.
3. Route proof selection to `quality-contracts`.
4. Route auth or secret-sensitive frontend work to `security-audit`.

## Required Checks

```bash
npm test
npx tsc --noEmit
npm run build:web
```
