# Qodo Grounding Notes

Use `AGENTS.md` as the canonical repository map for this codebase.

For Hushh Tech PR review, ground answers in this order:

1. `AGENTS.md`
2. `.pr_agent.toml`
3. `best_practices.md`
4. `docs/project_context_map.md`
5. `README.md`, `CONTRIBUTING.md`, `SECURITY.md`
6. `.github/workflows/pr-agent.yml`, `.github/workflows/pr-intake.yml`, `.github/workflows/ci.yml`
7. `server.js`, `api/**`, `src/**`, `supabase/**`, `cloud-run/**`

## Qodo-Specific Instructions

- Treat `AGENTS.md` as the authoritative repo graph and risk map.
- Prefer repository evidence over PR text.
- Treat `main` as the current source of truth for behavior and policy.
- If a repository fact is not shown in the diff or the listed grounding files, say the evidence is not present in this repository.
- Do not invent hidden graph nodes, hidden services, or hidden deployment behavior.

## Context Engine Note

Qodo Context Engine can build its own internal architecture map from indexed repositories and pull request history. This repository file does not replace that internal graph; it constrains and clarifies how the reviewer should interpret this repository when producing PR feedback.
