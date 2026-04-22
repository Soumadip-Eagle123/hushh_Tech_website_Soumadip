# Decision Buckets

Use these stories as the concrete guardrails for maintainer PR triage.

## `Merge`

Use when the PR is correct as submitted.

Example:

- contributor updates community card styling
- agent review is clean
- required checks pass
- there is no meaningful behavioral regression

## `Patch-and-merge`

Use when the PR is directionally correct and only needs a small bounded maintainer fix.

Example:

- contributor fixes a nav route
- one path still points to the wrong destination
- maintainer patches that one line
- maintainer reruns relevant checks
- then merges

Never use this bucket for auth correctness, env wiring, secret handling, deploy governance, or broad API contract changes.

## `Request changes`

Use when the contributor needs to rework logic, scope, or proof.

Example:

- contributor changes OAuth callback behavior
- stale-session acceptance is introduced
- tests pass, but the real contract is wrong
- contributor must update the PR

## `Discard/close`

Use when keeping the PR open is lower-value than closing it.

Example:

- broken install
- unrelated churn
- invalid package config
- duplicate or stale work
- wrong-repo or unsafe submission
