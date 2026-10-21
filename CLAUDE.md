# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Forgia** ("forjar" in Italian) is a CrossFit AI coaching app at forgia.fit. It generates personalized WODs (Workout of the Day) using Claude (Anthropic), tracks performance, manages periodization, and provides training intelligence. All user-facing text is in **Spanish** (es_MX locale).

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Dev server at localhost:3000
pnpm build            # Production build
pnpm lint             # ESLint check
```

No test framework is configured.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...             # Server-side only
NEXT_PUBLIC_GA_ID=...             # Optional, GA4
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...  # Web push (recordatorios)
VAPID_PRIVATE_KEY=...             # Server-side only
VAPID_SUBJECT=mailto:...
CRON_SECRET=...                   # Bearer que manda pg_cron; igual al secreto 'push_cron_secret' en Vault
SUPABASE_SERVICE_ROLE_KEY=...     # Sólo para /api/cron/* y el webhook de Stripe (src/lib/supabase/admin.ts)
STRIPE_SECRET_KEY=...             # Llave restringida de la cuenta Stripe "Forgia" (MXN)
STRIPE_WEBHOOK_SECRET=...         # Firma de /api/stripe/webhook
```

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5**
- **Tailwind CSS 4** via PostCSS (no tailwind.config — uses CSS-based config in `globals.css`)
- **Supabase** for PostgreSQL database + auth (email/password)
- **Claude** (`@anthropic-ai/sdk`; model per route in `AI_MODELS`: Opus 5.5 for WOD/program, Sonnet 5.5 for chat, Haiku 5.5 for weekly analysis) for AI generation — server-side only, shared client in `src/lib/ai/claude.ts`, Zod output schemas in `src/lib/ai/schemas.ts`
- **pnpm** as package manager
- Path alias: `@/*` maps to `./src/*`

## Architecture

### Routing & Auth

- `/app/*` routes are **protected** via `src/proxy.ts` (redirects to `/login` if unauthenticated)
- `/login` redirects to `/app` if already authenticated
- OAuth callback at `/auth/callback`
- `AuthContext` provides client-side user/profile state
- `OnboardingGuard` wraps protected pages, redirecting new users to `/app/onboarding`

### Data Flow

- **Client components** call `src/lib/ai-client.ts` helper functions (thin fetch wrappers)
- These hit **API routes** at `src/app/api/*` which use the Supabase server client and Claude
- The Anthropic API key is never exposed to the client — all AI calls happen server-side
- Supabase clients: `src/lib/supabase/client.ts` (browser) and `src/lib/supabase/server.ts` (API routes/proxy)

### Key API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/generate-wod` | Generate a personalized WOD with periodization context |
| `POST /api/generate-program` | Generate a 4-week training program |
| `GET /api/weekly-analysis` | Weekly performance summary |
| `GET /api/training-intelligence` | ML-driven training insights |
| `POST /api/assessments` | Start a benchmark level assessment |
| `POST /api/assessments/[id]/complete` | Complete an assessment |

### State Management

- **React Context** only: `AuthContext` (user/profile) and `ThemeContext` (dark/light with localStorage)
- No Redux, Zustand, or other state library — local `useState` for component state

### Database (Supabase)

Direct Supabase JS client queries (no ORM). Key tables: `profiles`, `wods`, `workout_feedback`, `training_programs`, `personal_records`, `level_assessments`, `template_results`. SQL migrations are gitignored.

### Key Business Logic

- `src/lib/periodization.ts` — 28-day rolling analysis to avoid repeating stimuli
- `src/lib/assessment-benchmarks.ts` — Benchmark definitions for level testing
- `src/lib/rm-calculator.ts` — 1RM estimation formulas
- `src/lib/wod-templates.ts` — Pre-built WOD template library
- `src/lib/analytics.ts` — GA4 custom event tracking

### Live Workout Mode

Components in `src/components/live/` provide a full-screen timer overlay with audio cues (`useAudioCues`), wake lock (`useWakeLock`), and section-by-section progression. Supports AMRAP, EMOM, For Time, and Tabata formats.

## Conventions

- **Spanish UI**: All user-facing strings, error messages, and Supabase auth error translations are in Spanish
- **CrossFit terminology** stays in English where standard (WOD, AMRAP, EMOM, Rx, Scaled, 1RM, PR, Metcon)
- **Brand color**: Red-500 `#EF4444` is the primary accent; gradient is `#EF4444 → #F97316`. Solid buttons with white text use `accent-solid` (`#DC2626`) for AA contrast
- **WOD section colors**: warmUp=amber, strengthSkill=blue, metcon=red, coolDown=emerald (tokens `warmup`, `strength`, `metcon`, `cooldown`)
- **Fonts**: Space Grotesk (`font-display`, titles and big numbers), Geist Sans (UI) and Geist Mono (timers/numbers), loaded via `next/font/google`

### Design system ("Pulso")
- Tokens live in `src/app/globals.css`. New code uses the semantic ones (`bg-ground`, `bg-surface`, `bg-raised`, `border-line`, `text-fg`, `text-muted`, `text-accent`, `bg-accent-solid`, `bg-accent-soft`) instead of `neutral-*` + `dark:` pairs; they switch with the theme on their own. The Tailwind `neutral` scale is re-tinted to the same cool grays so older classes still match
- Reuse the primitives in `src/components/ui/`: `Button`/`ButtonLink`/`IconButton`, `Card`/`Eyebrow`, `TextField`/`TextAreaField`/`SelectField`, `Dialog`/`ConfirmDialog` (native `<dialog>`, use for every modal and for confirming destructive actions), `SegmentedButton` (options) and `TabLinks` (sub-route tabs). Combine classes with `cx` from `@/lib/cx`
- Navigation: `NAV_ITEMS` in `src/components/nav/nav-items.ts` feeds both the mobile `BottomTabBar` and the desktop header. Anything fixed to the bottom of the screen sits at `bottom-(--tabbar-h)` so it clears the tab bar on mobile
- Progreso groups `/app/progreso` (resumen), `/historia`, `/records` and `/programa`; the old `/app/historia|records|programa` URLs redirect there (`next.config.ts`)
- A global `:focus-visible` outline and a `prefers-reduced-motion` reset live in `globals.css`; don't remove focus styles in components
- **Icons**: Lucide React exclusively
- Client components use `'use client'` directive
- Brand guidelines are in `docs/BRAND_GUIDELINES.md`

## Code Quality Conventions

### Security
- All AI-calling API routes (`/api/generate-*`, `/api/weekly-analysis`, `/api/assessments/*`) must import and call `checkRateLimit` from `@/lib/rate-limit`
- User-supplied text (session notes, chat messages, injury history, feedback notes, names, the client-sent WOD) must go through `sanitizeUserText` and be wrapped with `xmlBlock` from `@/lib/ai/prompt` before entering an AI prompt

### AI prompts
- Prompt builders live in `src/lib/ai/prompts/*`; routes only assemble data and call `generateStructured` / `openTextStream` from `@/lib/ai/claude`
- System prompts go stable-to-variable: a base-instructions constant identical for every user first, then per-user context in XML tags. Never interpolate per-request values (dates, IDs) into the base block — it breaks prompt caching
- Write instructions plainly with the reason behind them; no all-caps pressure words (`MUST`, `NUNCA`, `DIRECTIVA`). Output format is enforced by the Zod schema, not by prose
- Each call logs an `ai_usage` JSON line (tokens, cache reads/writes) — check it in Vercel logs before changing caching or models
- API route error responses must NEVER include `error.message` — log internally, return a generic Spanish message to the client
- Auth callback (`/auth/callback`) must validate redirect paths and OTP types against allowlists
- `next.config.ts` must include security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

### Performance
- Landing page (`src/app/page.tsx`) must remain a Server Component — no `'use client'`
- Heavy overlays/modals must use `dynamic()` from `next/dynamic` with `{ ssr: false }`
- All `<Image fill>` must include a `sizes` prop; blog images use `sizes="(max-width: 768px) 100vw, 768px"`
- Prefer Lucide React imports over inline SVG definitions — zero tolerance for `const FooIcon = (props) => <svg ...>`

### Tailwind CSS 4
- Custom animations must be registered as `--animate-*` tokens in `@theme inline` block in `globals.css` — never use manual `.animate-*` classes
- Use `@custom-variant` for dark mode, not `darkMode` config

### Next.js App Router
- `src/app/app/loading.tsx` and `src/app/app/error.tsx` must exist (cascade to all sub-routes)
- `src/app/app/layout.tsx` must export `metadata` with `title.template` for proper tab titles
- Protected routes use `src/proxy.ts` (not middleware.ts) — Next.js 16 convention
