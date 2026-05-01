---
name: Future apps roadmap
description: Planned apps to add to the monorepo beyond seller and admin
type: project
---

The monorepo is planned to eventually have 4 apps under apps/:
- seller (exists) — mobile POS for cashiers
- admin (exists, in progress) — manager/owner web dashboard
- driver — TBD
- producer — TBD

**Why:** The architecture was intentionally built as a Turbo monorepo to support these future apps sharing packages (db, features, ui, utils, services).

**How to apply:** When adding driver or producer, scaffold them as new Next.js apps under apps/ and wire them into pnpm-workspace.yaml and turbo.json. They should reuse shared packages rather than duplicating code.
