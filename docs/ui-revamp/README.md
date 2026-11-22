# UI/UX Revamp — "Signal Console"

Tracking document for the `feat/ui-ux-revamp` branch.

## Approved decisions

| Topic | Decision |
|---|---|
| Visual direction | **A. Signal Console** — precision-instrument aesthetic, graphite surfaces, emerald reserved as the "verified" signal, amber/rose for risk; editorial footnote-style citations and serif quoted evidence borrowed from direction C |
| Theme default | Dark-first (unchanged default) with a new **System** option that follows `prefers-color-scheme` |
| Dependencies | `tw-animate-css`, `cmdk`, `vaul`, additional Radix primitives; dev-only `@playwright/test`, `@axe-core/playwright` |
| Responsive tests | Replace class-string assertions in `scripts/verify-responsiveness.mjs` with behavioural Playwright tests |
| Session deep links | Yes — `?kb=<id>&session=<id>` (existing `?kb=` share links keep working) |
| Markdown renderer | Deferred — keep the in-house parser to protect citation rendering |
| Route transitions | React 19.3 `<ViewTransition>` + `<Link transitionTypes>` (supported natively by Next 16.4, see `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`) |

## Invariants (must not change)

- API routes, request payloads, response handling and headers (`x-citations`, `x-groundedness`, `x-ratelimit-remaining`).
- localStorage keys: `app-theme`, `app_locale`, `enterprise_rag_byok_settings`, `enterprise_rag_onboarding_dismissed`.
- Markdown / JSON chat export formats.
- Demo profiles and multi-tenant profile switching behaviour.
- Author credit ("Designed and Developed by Dandy Rahmat Zain") stays visible on landing, login and dashboard.

## Phase status

| Phase | Status |
|---|---|
| 0 — Setup & safety net | ✅ done |
| 1 — Design tokens & foundations | ✅ done |
| 2 — Primitive components & motion kit | ⏳ next |
| 3 — Dashboard shell & navigation | — |
| 4 — Chat & evidence experience | — |
| 5 — Documents, tools & settings | — |
| 6 — Landing, login & docs | — |
| 7 — i18n, a11y, performance & QA | — |

## Baseline (Phase 0, commit `da393ac`)

Captured against `pnpm dev` with the in-memory store (no `DATABASE_URL`, no LLM keys — chat uses the deterministic demo stream).

- 66 screenshots: 4 routes × 3 viewports (390 / 768 / 1440) × 2 themes × 2 locales, plus chat, citation drawer and onboarding states.
- No page-level horizontal overflow, no console errors.
- Known pre-existing issues:
  - Mobile: long unbroken document titles overflow chat bubbles (inner scroll container) → Phase 4.
  - `scripts/e2e-ui-ux-audit.mjs` and `scripts/deep-qa-test.mjs` each fail one assertion that expects the Indonesian label "Tamu Publik" on `/login`; English is the default locale so the page renders "Public Guest". Stale test, not a UI regression → Phase 7.

| Script | Baseline result |
|---|---|
| `verify-responsiveness.mjs` | pass (33) — class-string based, will be replaced |
| `test-rag`, `test-scope`, `test-new-features`, `test-phase2-security`, `test-phase3-public`, `test-landing-and-restore`, `test-multi-tenant-auth` | pass |
| `e2e-ui-ux-audit.mjs` | 38 pass / 1 fail (stale "Tamu Publik" assertion) |
| `deep-qa-test.mjs` | 39 pass / 1 fail (same) |

## Phase 1 notes

- **Tokens:** `app/globals.css` defines light (`:root`) and dark (`.dark`) values, exposed as Tailwind utilities via `@theme inline` (`bg-card`, `text-muted-foreground`, `text-signal-text`, `shadow-elevation-2`, `rounded-card`, `text-display`, `ease-out-expo`, …). Components migrate to them as they are rebuilt in Phases 2–6.
- **Contrast:** `pnpm check:tokens` audits every text/UI pairing (86 checks, WCAG AA). The previous light primary button (white on `#059669`) was 3.77:1; the token is now `#047857` (5.48:1).
- **Fonts:** Geist was downloaded but never applied (`font-sans` was not mapped). It is now wired through `--font-sans` / `--font-mono`; Newsreader (`font-serif`, not preloaded) is reserved for quoted evidence.
- **Theme:** `lib/theme.ts` is the single source for the no-flash init script and the provider. Preferences: `dark` (default) · `light` · `system` (live OS tracking, cross-tab sync, View Transition cross-fade on switch). Toasts now follow the theme.
- **Motion:** `lib/motion.ts` mirrors the CSS motion tokens; `tw-animate-css` makes the existing `animate-in …` classes work; `prefers-reduced-motion` is honoured globally.
- **Dev gotcha:** Turbopack's persistent cache (`.next/dev`) can keep serving a stale `globals.css` after a `git stash`/branch switch. If CSS edits don't show up, stop `pnpm dev`, delete `.next/`, and restart.

## User-action inventory

Every item must remain reachable and behave identically after Phase 3–6 (acceptance checklist).

### Landing `/`
- [ ] Header: Docs link · language EN/ID · theme toggle · Login (guest) / Dashboard (signed in) · Start sandbox CTA
- [ ] Hero: Start sandbox → `/dashboard` · "Search" runs quick search
- [ ] Quick search: input + Enter · Search button · starter query pills · results with latency badge · demo fallback results on error
- [ ] Footer: Docs · Dashboard links · author credit

### Login `/login`
- [ ] Back link · language · theme toggle
- [ ] Tabs: Demo / Login / Register
- [ ] Demo profiles: Admin · Member · Guest → `/dashboard`
- [ ] Login form (email, password) · Register form (name, email, password ≥ 6)
- [ ] Redirect to `/dashboard` when already signed in

### Dashboard — sidebar
- [ ] Knowledge-base switcher · Share KB (copies `?kb=` link) · Backup KB (export endpoint) · New KB (opens create/restore modal)
- [ ] Upload (click → file picker `.pdf,.txt,.md,.json,.csv`) with indexing status
- [ ] Documents tab: refresh · filter · inspect (details modal) · delete · seed demo docs (empty state)
- [ ] Chats tab: new chat · filter (> 2 sessions) · select · inline rename (Enter / Esc / ✓ / ✕) · delete
- [ ] Plan & quota card · vector capacity card
- [ ] User menu: switch demo profile ×3 · language · login link · logout
- [ ] Theme toggle · desktop collapse/expand · mobile drawer open/close/backdrop
- [ ] Author credit

### Dashboard — chat workspace
- [ ] Header: mobile menu · threshold/top-K badge · New session · Vector playground · KB metrics · Export .md · Export .json · User guide · More menu (< lg) · Settings · language · theme
- [ ] Empty state: 3 starter prompts send immediately
- [ ] Message: markdown + code blocks (copy) · inline citation buttons · citation chips → drawer · groundedness badge → audit modal · like / dislike · copy
- [ ] Composer: Enter send / Shift+Enter newline · Upload (modal) · document scope select · voice input · Send
- [ ] 429 quota message · low-quota warning toast · error message
- [ ] Session messages load on select · onboarding sample prompt pre-fills input

### Dashboard — modals & drawers
- [ ] Citation drawer: Esc · copy snippet · close
- [ ] Upload modal: drag & drop · multi-file queue · remove file · upload batch · seed
- [ ] Create KB modal: create · restore from backup file
- [ ] Document details: chunk list · copy chunk · export JSON / Markdown · delete
- [ ] Settings: language · similarity threshold · top-K · provider · search mode · re-ranking · BYOK keys (show/hide) · save
- [ ] Semantic search playground: query · threshold · mode · results
- [ ] KB analytics
- [ ] Onboarding: highlights · sample prompts · "don't show again" · open settings
- [ ] Groundedness audit modal

### Docs `/docs`
- [ ] Header nav · language · theme · section TOC
- [ ] Code snippet tabs (cURL / TypeScript / Python) · copy
- [ ] Live API console: run request · response view
