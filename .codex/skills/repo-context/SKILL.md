---
name: repo-context
description: Use when a request starts with scanning Hushhtech, mapping repo surfaces, or choosing which owner skill should take the next step.
---

# Hushhtech Repo Context Skill

## Purpose and Trigger

- Primary scope: `repo-context-intake`
- Trigger on broad repository scans, first-pass contributor orientation, and choosing the correct owner skill before implementation or PR triage starts.
- Avoid overlap with `oss-contribution-triage`, `repo-operations`, and `docs-governance`.

## Coverage and Ownership

- Role: `owner`
- Owner family: `repo-context`

Owned repo surfaces:

1. `.codex/skills/README.md`
2. `docs/project_context_map.md`
3. `docs/reference/operations/skill-taxonomy.md`

Non-owned surfaces:

1. `oss-contribution-triage`
2. `repo-operations`
3. `security-audit`
4. `docs-governance`
5. `frontend`
6. `backend`

## Do Use

1. Broad repo orientation before picking a narrower skill.
2. Mapping which owner skill owns a changed surface.
3. Routing "someone opened a PR, what do we do?" into `oss-contribution-triage`.
4. Breaking ties when a PR touches multiple owner surfaces.

## Do Not Use

1. Detailed PR decision work after the surface is already clear.
2. CI or deploy investigation once the task is clearly operational.
3. Auth, secret, or API-risk analysis that belongs to another owner skill.

## Read First

1. `.codex/skills/README.md`
2. `docs/project_context_map.md`
3. `docs/reference/operations/skill-taxonomy.md`

## Workflow

1. Identify the changed surface first.
2. Pick the owner skill before reading deeply.
3. Route contributor PR review into `oss-contribution-triage` as soon as the request becomes a maintainer decision problem.
4. When a PR spans multiple owners, treat the highest-risk surface as the default owner and pull adjacent skills in as inputs.

## Handoff Rules

1. Route PR decision work to `oss-contribution-triage`.
2. Route CI or workflow questions to `repo-operations`.
3. Route auth, env, secret, or fail-closed questions to `security-audit`.
4. Route docs placement and policy work to `docs-governance`.
5. Route product implementation to `frontend` or `backend`.

## Required Checks

```bash
rg --files .github/workflows scripts/ci src api tests docs
node -e 'const p=require("./package.json"); console.log(JSON.stringify(p.scripts,null,2))'
```
