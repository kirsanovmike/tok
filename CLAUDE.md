# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state of the repo

The component is **built and working**, delivered through a demo host (ADR-0005). Two source trees:

- `src/Tok/` — the portable component, in library layout: `Tok.vue` (parent) + `SubComponents/` (all child SFCs, flat) + `services/` (all logic, no `.vue`) + `theme/tokens.js` + `styles/_tokens.scss`. Copied into Трансфера — and into the shared component library — as is. See `src/Tok/README.md` and ADR-0008.
- `src/demo/` — the stand that hosts it. Never imported from `src/Tok/`.

Inside `src/Tok/` **only relative imports** are allowed (no `@/…`): the folder lands in projects where the `@` alias may not exist. Enforced by ESLint (`overrides` for `src/Tok/**`) and by `tests/unit/tok-boundary.spec.js`, which also guards the layout itself.

Tests live in `tests/unit/` — never inside `src/Tok/`.

## What is being built

**Tok** — an AI-assistant chat component embedded into **Трансфера**, an energy-retail (энергосбыт) platform. It is a slide-out panel, not a standalone app: it must drop into the existing Трансфера Vue 2 application.

The authoritative brief is `docs/Задача.txt` (Russian, dictated). Read it before any UI work — it contains explicit requirements that are easy to get wrong (panel corner radii, which parts of the Figma mockups are *not* wanted). Later rounds of customer notes — `docs/Доработки и корректировки 1.txt` and `2.txt` — **override** it where they disagree; the newest note wins.

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
- **Panel**: slides in from the right over a dimming overlay. Left corners rounded, **right edge square** — it reads as a curtain flush to the viewport edge, not a floating card. Width 520px is the **minimum and the starting width**, not a fixed one: a handle on the left edge drags the panel out to full screen (`services/utils/panelWidth.js`, `SubComponents/TokResizeHandle.vue` — arrows step 24px, Home returns to the minimum, End opens full screen, double-click returns to the minimum). Below a 600px viewport there is no handle and the panel is full width. The width lives in panel state and deliberately does **not** survive a reload: `localStorage` holds the conversation with a TTL (ADR-0004), and an interface setting has no business there.
- **Empty state**: Tok logo (`docs/Logo.svg`), greeting, and a stack of suggested-question chips.
- **Feed**: user messages on the right, Tok's answers on the left («Доработки 3», п. 1). The scrolling element is the feed itself, not the panel body — so the horizontal padding is held by the feed and the empty state, not by their parent, and the scrollbar sits flush to the panel edge. The bar is thin and muted: `tok-thin-scrollbar` (6px, `border-strong`) instead of the browser's 12–15px default.
- **Composer**: two layouts on one CSS Grid, per `docs/Референс на поле ввода когда нет текста.png` and `docs/Референ на скролл и поле ввода коргда много текста.png`. While the text is one line, the buttons sit in the same row as the field; once it wraps, they move to a bottom row — clear on the left, microphone and send on the right («Доработки 3», пп. 3–4). Both layouts differ by one `grid-template-areas` line, so the `textarea` never remounts. Height ceiling is eight lines, after which the field scrolls inside itself with the same thin bar. Voice input has its own in-progress state — see `В процессе набора аудио.png`; the send button activates when there is text.
- **Loading**: sparkles rotating **about the vertical axis** (`rotateY`, with `perspective` on the badge — without it the spin degenerates into a horizontal squash) beside a rotating caption. The original brief asked for a Z-axis in-plane spin; «Доработки и корректировки 2», п. 4 overrides it.
- **Loading captions**: a **scripted** sequence, not a bag of lines — the rotator walks the list top to bottom and then cycles only the last `TAIL_SIZE` phrases, so «Почти готово…» never falls back to «Думаю…». Phrases naming the *process* are wanted («Ищу по Трансфере…», «Анализирую данные…» — the customer's own wording in «Доработки 2», п. 7). Phrases naming *domain entities* (договор, тариф, объём, стоимость, счёт, киловатт) stay forbidden: the set cycles regardless of the question and would start lying. Enforced by `tests/unit/tok-loader.spec.js`. The pause between phrases is 2700 мс («Доработки 3», п. 5 — the previous 1800 мс read as flicker).
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
