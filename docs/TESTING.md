# Testing

See [foundation spec §13](./superpowers/specs/2026-04-29-dord-foundation-design.md#13-testing-locked).

| Layer | Runner | Scope |
|---|---|---|
| Unit | Vitest (node project) | pure logic |
| Browser | Vitest (browser project, Playwright Chromium) | R3F components, BVH raycast, Rapier collisions |
| E2E | Playwright | golden path (`@golden`), perf (`@perf`) |

CI maps these to four jobs in `.github/workflows/ci.yml`: `core`, `browser`, `e2e-smoke`, `bundle-size`.
