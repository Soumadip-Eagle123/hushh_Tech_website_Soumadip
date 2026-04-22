# Hushhtech Codex Skills

This directory contains the first-wave Codex skill system for Hushhtech.

The first rollout is intentionally OSS-first. It is optimized for:

1. contributor PR intake
2. maintainer triage after agent review and CI
3. deterministic routing into the right owner skill

Definitions:

- `owner skill`: the default entrypoint for a repo surface or decision lane
- `spoke skill`: a narrower specialist that sits under an owner skill
- `workflow pack`: a deterministic execution playbook with machine-readable routing metadata

## Wave 1 skills

Owner skills:

1. `repo-context`
2. `oss-contribution-triage`
3. `repo-operations`
4. `security-audit`
5. `docs-governance`
6. `frontend`
7. `backend`

Spoke skills:

### `oss-contribution-triage`

1. `quality-contracts`

### `frontend`

1. `frontend-design-system`

### `backend`

1. `backend-api-contracts`

## Current workflow packs

1. `contribution-triage`

This is the first implemented workflow pack. It classifies incoming pull requests into one of four maintainer outcomes:

1. `Merge`
2. `Patch-and-merge`
3. `Request changes`
4. `Discard/close`

## How to use this skill fleet

1. Start with `repo-context` when the affected surface is not yet clear.
2. Start with `oss-contribution-triage` when the task is, "A contributor opened a PR. What should we do?"
3. Use [`repo-operations`](./repo-operations/SKILL.md) to determine whether checks ran, what failed, and whether the pipeline can be trusted.
4. Use [`quality-contracts`](./quality-contracts/SKILL.md) to determine the smallest authoritative proof.
5. Use [`security-audit`](./security-audit/SKILL.md) when auth, env, secrets, or sensitive API behavior make maintainer patching risky.
6. Use [`frontend`](./frontend/SKILL.md), [`frontend-design-system`](./frontend-design-system/SKILL.md), [`backend`](./backend/SKILL.md), or [`backend-api-contracts`](./backend-api-contracts/SKILL.md) when a PR is directionally correct and needs a bounded maintainer patch.
7. If a PR spans multiple owner surfaces, start with [`repo-context`](./repo-context/SKILL.md) and let the highest-risk surface win.

If doing this manually without the skill system, read:

1. [Operations Reference](../../docs/reference/operations/README.md)
2. [Quality Reference](../../docs/reference/quality/README.md)
3. [Project Context Map](../../docs/project_context_map.md)

## Wave 2

Deferred skills for a later rollout include:

1. `frontend-architecture`
2. `frontend-surface-placement`
3. `backend-runtime-governance`
4. `codex-skill-authoring`
5. mobile and MCP-specific skills
