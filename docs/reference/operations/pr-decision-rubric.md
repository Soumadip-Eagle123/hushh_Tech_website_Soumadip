# PR Decision Rubric

Use this rubric after reading the agent review and the PR-check surface.

| Bucket | Use when | Patch allowed | Default maintainer action |
| --- | --- | --- | --- |
| `Merge` | behavior is correct, checks are acceptable, no meaningful correction is needed | no patch needed | approve and merge |
| `Patch-and-merge` | PR is directionally correct and only needs a small bounded maintainer fix | yes, if low-risk and local | patch, rerun relevant checks, then merge |
| `Request changes` | contributor needs to rethink logic, scope, or proof | no | leave review comments and keep the PR open |
| `Discard/close` | duplicate, stale, unsafe, wrong-repo, too broken, or lower-value than patching from scratch | no | close with a clear reason |

## Minimum maintainer output

Every triage decision should record:

1. bucket
2. reason
3. risk level
4. checks run, missing, or blocked
5. whether maintainer patching is allowed
6. next action

Template:

```md
Bucket: <Merge | Patch-and-merge | Request changes | Discard/close>
Reason: <one concise explanation>
Risk level: <low | medium | high>
Checks: <ran / missing / blocked>
Patch allowed: <yes | no>
Next action: <merge | maintainer patch | contributor update | close>
```

## Example stories

### `Merge`

Contributor updates a community card style, all checks pass, agent review is clean, and no behavior regresses.

### `Patch-and-merge`

Contributor fixes a nav route, but one path still points to the wrong destination. The maintainer patches that one line, reruns checks, and merges.

### `Request changes`

Contributor changes OAuth callback logic and introduces stale-session acceptance. Even with green tests, the contributor needs to rework the logic.

### `Discard/close`

Contributor opens a huge mixed PR with broken install, unrelated churn, and invalid package config. Closing is safer than patching.
