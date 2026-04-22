# Skill Taxonomy

This is the current first-wave Hushhtech Codex skill taxonomy.

Definitions:

- `owner skill`: the default entrypoint for a repo surface or decision lane
- `spoke skill`: a narrower specialist that sits under an owner skill
- `workflow pack`: a deterministic execution playbook with machine-readable routing metadata

## Owner skills

1. `repo-context`
2. `oss-contribution-triage`
3. `repo-operations`
4. `security-audit`
5. `docs-governance`
6. `frontend`
7. `backend`

## Spoke skills

### `oss-contribution-triage`

1. `quality-contracts`

### `frontend`

1. `frontend-design-system`

### `backend`

1. `backend-api-contracts`

## Why `oss-contribution-triage` exists

Kai's research repo has strong routing and bug-triage patterns, but it does not expose a single explicit maintainer decision skill for open-source pull requests.

Hushhtech makes that decision layer explicit so maintainers can consistently classify PRs into:

1. `Merge`
2. `Patch-and-merge`
3. `Request changes`
4. `Discard/close`

## Current workflow packs

1. `contribution-triage`

Later workflow packs can be added once the first-wave OSS review path is stable.
