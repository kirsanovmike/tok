# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state of the repo

There is **no code yet** — only `docs/` (specification, Figma reference screenshots, theme palette, API contract, logo). The first implementation task is to scaffold the component. Do not assume a `package.json`, build tooling, or test runner exists; check before referencing commands.

## What is being built

**Tok** — an AI-assistant chat component embedded into **Трансфера**, an energy-retail (энергосбыт) platform. It is a slide-out panel, not a standalone app: it must drop into the existing Трансфера Vue 2 application.

The authoritative brief is `docs/Задача.txt` (Russian, dictated). Read it before any UI work — it contains explicit requirements that are easy to get wrong (panel corner radii, rotation axis of the loader sparkles, which parts of the Figma mockups are *not* wanted).

Product scope (`docs/На какие вопросы хотим отвечать в Ток.png`): cost analysis over energy contracts — tariffs (`cost`), consumption (`volume`), and price (`price`), each answerable as a single value for a period, a dynamics chart, or a period-over-period percentage delta. Answers are scoped by contract + date range.

## Target stack

Locked by `docs/dependecies.txt` — this is the host application's dependency set, so build against these versions, not modern equivalents:

- **Vue 2.6.14** (Options API, no Composition API), **Vuetify 2.6.3**, Vuex 3, Vue Router 3
- **Vue CLI 4.5** (`@vue/cli-service`) + Jest (`@vue/cli-plugin-unit-jest`) + `@vue/test-utils` 1.x
- **SCSS** (`sass` 1.49), **stylelint** (standard + scss + vue configs), **ESLint** (airbnb + vue + vuetify + prettier)
- **amCharts 4** (`@amcharts/amcharts4` 4.10.20) for charts — v4, not v5; the API differs completely
- **axios 0.21.4** for transport, **date-fns** / **date-fns-tz** for dates, **portal-vue** for rendering the panel outside its parent's DOM tree
- **`@tne-ui/*`** — the in-house design system (`core`, `components`, `sprites`, `notify`, …). Prefer these primitives over hand-rolled or raw Vuetify components; they are what the rest of Трансфера looks like.

Standard Vue CLI 4 scripts once scaffolded: `vue-cli-service serve` / `build` / `lint` / `test:unit`. Single test: `npx vue-cli-service test:unit --testPathPattern <path>` or `-t "<test name>"`.

## Theming

`docs/theme.txt` holds the host app's **current** Vuetify palettes — `dark:` first, then `light:` — as frozen colour objects (`indigo`, `yellow`, `blue`, `purple`, `red`, `orange`, `green`, `grey`, `shades`, plus `*Deep` variants). Two things to know:

- The palettes are structurally identical; only values differ. Any colour Tok needs must be added to **both**, keeping keys in sync.
- Values are semantically inverted in dark mode (e.g. `grey.lighten4` is `#F9F9F9` in light and `#FFFFFF` in dark; `shades.white` is `#2A2A2A` in dark). Never hardcode a hex in a component — always go through the palette key, or dark mode breaks.

The light theme can be derived from the Figma screenshots. Dark has no reference; it must be authored. The brief also calls for extending the palette with a gradient.

## API contract

`docs/api structure.txt` (C# DTOs from the backend, plus the JSON shape). One endpoint, one round-trip per message:

- Request: `{ conversationId: string | null, message: string }` — `conversationId` is null for the first message and echoed back thereafter.
- Response: `{ reply, workflow, contents[] }`
  - `reply.kind` ∈ `clarification | confirmation | success | fallback | error` — drives how the bubble is presented.
  - `workflow.status` ∈ `collecting | confirming | executing | completed | fallback | informational | forbidden`, plus `intent`, `domain`, `awaitingConfirmation`. This is a **multi-turn state machine**: the assistant collects parameters, asks for confirmation, then executes. The UI must reflect the current status (e.g. surface confirm/cancel affordances when `awaitingConfirmation` is true) rather than treating every response as a finished answer.
  - `contents[]` is a discriminated union keyed on `type` — the renderer dispatches one child component per entry, in order.

Two items are noted as not-yet-specified in the contract: universal contents and `source` (citations/links). Design the renderer so both can be added without reshaping it.

## Content types

Per `docs/Какое тз было дизайнеру в части опций` the payload types are `text`, `table`, `chart`, `list`, `stat`:

- `text` — plain prose answer.
- `table` — `{ columns, rows }` where rows are key→value maps. Must stay readable inside the narrow panel across desktop and tablet (Трансфера's responsive targets), with pagination or page-flipping to stay compact, an Excel export affordance on the table itself, and a card/compact-table path for eventual mobile.
- `chart` — amCharts 4 with useful controls (zoom, legend, axis labels). The backend's `ChartPayloadData` carries `{ kind, xField, yField, series[] }`; the brief asks to **split `chart` into distinct concrete types** (line, bar, pie/circle, …) each with a sensible default config, rather than one do-everything chart component. Note `docs/api structure.txt` shows `"type": "circle"` in the `contents` example — treat chart kinds as first-class content types.
- `list` — enumerated text or numeric values.
- `stat` — `{ label, value, unit }`; a percentage or number in a styled block.

## Interaction and visual requirements

From `docs/Задача.txt` and `docs/referencies from FIGMA/`:

- **Entry point**: floating sparkle ("звёздочки") button, bottom-right of the host page.
- **Panel**: slides in from the right over a dimming overlay. Left corners rounded, **right edge square** — it reads as a curtain flush to the viewport edge, not a floating card.
- **Empty state**: Tok logo (`docs/Logo.svg`), greeting, and a stack of suggested-question chips.
- **Composer**: single-line input with a microphone (voice input has its own in-progress state — see `В процессе набора аудио.png`) and a send button that activates when there is text.
- **Loading**: sparkles rotating **about the Z axis** (in-plane spin — explicitly *not* about the vertical axis) beside a rotating caption. Author 5–10 playful but data-agnostic Russian phrases that cycle (the brief's own examples: «Думаю…», «Шуршу по данным Трансферы…», «Нужно ещё немного подумать…»). Keep it tasteful and non-irritating; do not make the copy imply specific data lookups.
- **Explicitly out of scope**: the "не нашли ответа, напишите в службу поддержки" support-fallback line visible in several mockups.

Figma source (mobile UI lib): https://www.figma.com/design/9AIcjmWJolvYfX2mlkaRJI/UI-LIB-Mobile?node-id=1447-24457

## Docs and naming conventions

`docs/` filenames are Russian and mostly unquoted-unfriendly (spaces, no extensions) — quote paths in shell commands. Note the directory is spelled `referencies from FIGMA` and the file `dependecies.txt` (both misspelled); use the literal names. UI copy is Russian.

## Agent skills

### Issue tracker

Issues live as GitHub issues on `kirsanovmike/tok`, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, used verbatim as label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
