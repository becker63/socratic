# Socratic

A small weekend experiment in building a **deterministic UI on top of stochastic LLM output**.

This project explores:

- Structured LLM output with Zod
- Modeling UI behavior with XState
- Using the Stately inspector for live state debugging
- Treating scroll behavior as a testable invariant

Not a product. Just a systems playground.

---

## What It Does

Generates (or replays) a 12-turn debate between two personas:

- `security_engineer`
- `application_engineer`

The output must:

- Strictly alternate speakers
- Match a Zod schema
- Contain bounded Markdown
- Constrain Mermaid diagrams
- Pass structured parsing via OpenAI

The UI renders the debate in mirrored panes and auto-scrolls as turns appear — unless the user takes control.

Scroll ownership is explicitly modeled.

---

## Architecture (High Level)

**Schema layer**
- `shared/schemas.ts`
- Strict 12-turn structure
- Mermaid validation
- OpenAI `responses.parse` with Zod

**Control plane**
- Parallel XState machine:
  - `lifecycle` (idle → replaying → complete)
  - `scroll` (machineOwned ↔ userOwned)
- Live inspection with `@statelyai/inspect`

**Projection layer**
- `mitt` event bus
- View-model adapter (`useDebateProjection`)
- Height measurement for mirrored panes

**Layout stabilization**
- `ResizeObserver`
- Debounced settle window
- Scroll only after layout stabilizes

**Testing**
- Playwright E2E tests assert:
  - Monotonic scroll
  - Bottom detection
  - Ownership transitions
  - Centering tolerance

The DOM is treated as something measurable, not magical.

---

## Tech Stack

- TypeScript
- React 19
- XState v5
- Zod
- OpenAI structured outputs
- Bun + Vite
- Playwright
- Chakra UI
- Framer Motion

---

## Run It

```bash
bun install
bun run dev
