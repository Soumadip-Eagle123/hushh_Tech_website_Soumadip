# Design System Reference

This document is the tracked design-system pointer for the first-wave Hushhtech skill system.

## Shared ownership hints

`frontend-design-system` should own:

1. shared UI primitives
2. Hushhtech shell, header, footer, and nav treatment
3. reusable interaction patterns
4. theme-level rules that affect more than one route

`frontend` should still own route-local implementation unless the change modifies a reusable pattern or component contract.

## Review questions

Use this checklist before patch-and-merge on a shared UI PR:

1. Is the changed component reused across more than one route?
2. Does the fix change shell chrome, navigation language, or shared layout behavior?
3. Does the fix belong in `src/components/ui`, a `hushh-tech-*` shared component, or `src/theme`?
4. Can the change be validated with bounded checks without changing product intent?
