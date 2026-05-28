# PlatePlan

PlatePlan is a full-stack meal planning app built with Next.js App Router and Supabase.
It focuses on a clean MVP loop:

`Recipes -> Pantry -> Meal Planner -> Shopping List`

Phase 5 is focused on polish and production readiness: UX consistency, accessibility,
mobile refinement, and deployment preparation.

## MVP Features

- Authentication (email/password signup, login, logout)
- Protected app routes
- Recipe CRUD
- Spoonacular recipe browse + import into your recipe library
- Scan Recipe import (upload/take photo -> OpenAI Vision extraction -> review/edit -> save)
- Recipe image uploads
- Weekly meal planner
- Pantry item tracking (pantry/fridge/freezer)
- Pantry-aware recipe ingredient checks (have/missing/partial)
- Cook-from-pantry recipe recommendations
- Shopping list generation from planned meals
- Add only missing recipe ingredients to grocery list (with override review)
- Manual shopping list items
- Check/uncheck and clear checked shopping items
- Instacart shopping list export (server-side) with preferred store support
- Responsive mobile + desktop layout

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase (Auth, Postgres, Storage)
- OpenAI Responses API (vision extraction)
- shadcn/ui-style components
- lucide-react icons
- Vercel deployment target

## Progressive Web App (PWA)

Plate Plan now includes installable PWA support for:

- iOS Safari (Add to Home Screen)
- Android Chrome
- Desktop Chrome
- Microsoft Edge

### PWA Files and Locations

- Manifest: `src/app/manifest.ts` (served by Next.js at `/manifest.webmanifest`)
- Service worker: `public/sw.js` (registered only in production)
- Offline fallback: `public/offline.html`
- PWA icons:
  - `public/icon-192.png`
  - `public/icon-512.png`
  - `public/icon-maskable-192.png`
  - `public/icon-maskable-512.png`
  - `public/apple-touch-icon.png`

### Install Prompt Behavior

- A dashboard install card appears when install is supported (`beforeinstallprompt`).
- Prompt is hidden when already running in standalone mode.
- Dismissal is remembered in `localStorage` with a cooldown window.
- iOS Safari shows manual guidance:
  - "On iPhone or iPad, tap Share, then Add to Home Screen."

### Offline Behavior

- Navigation is network-first.
- If offline during navigation, the app shows `offline.html`.
- Offline page is explicit about limitations:
  - recipes, planner, imports, and shopping data still require internet in this phase.

### Cache Policy

Cached:

- Next.js static build assets (`/_next/static/*`)
- Local static assets needed for install/offline UI:
  - manifest
  - app icons
  - offline fallback page
  - local script/style/font assets

Intentionally **not** cached:

- Supabase auth/session responses
- Supabase database/REST responses
- Any `/api/*` response
- Recipe import/search/scan API routes
- Requests with `Authorization` headers
- Non-GET requests (`POST`, `PUT`, `PATCH`, `DELETE`)
- Next image optimizer responses (`/_next/image`)
- Cross-origin requests (including Supabase Storage and Spoonacular image hosts)

## Design Palette

- Primary Deep Sage: `#6D8B74`
- Secondary Warm Cream: `#F6F3EE`
- Accent Terracotta: `#D97B66`
- Dark Text Charcoal: `#2E2E2E`
- Optional Highlight Dusty Blue: `#7A9EBE`

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment file

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SPOONACULAR_API_KEY=your_spoonacular_api_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_RECIPE_SCAN_MODEL=gpt-4.1-mini
INSTACART_API_KEY=your_instacart_api_key
INSTACART_API_BASE_URL=https://connect.dev.instacart.tools
```

Required variables for local and production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SPOONACULAR_API_KEY` (server-only, never `NEXT_PUBLIC_`)
- `OPENAI_API_KEY` (server-only, never `NEXT_PUBLIC_`)
- `INSTACART_API_KEY` (server-only, never `NEXT_PUBLIC_`)
- `INSTACART_API_BASE_URL` (server-only)

Optional:

- `OPENAI_RECIPE_SCAN_MODEL` (defaults to `gpt-4.1-mini`)

Important:

- Do not use `NEXT_PUBLIC_OPENAI_API_KEY`.
- Add `OPENAI_API_KEY` in local `.env.local`.
- Add `OPENAI_API_KEY` in Vercel Project Settings -> Environment Variables.
- Restart the dev server after adding/changing environment variables.

### 3. Start local development

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scan Recipe Flow

1. Go to `Recipes -> Import Recipes -> Scan Recipe`.
2. Upload an image or take a photo of a recipe.
3. Click `Extract Recipe`.
4. The server calls OpenAI Vision and validates the structured JSON response.
5. Review and edit extracted fields (title, ingredients, instructions, etc.).
6. Save the reviewed recipe.

Saved scan recipes behave like regular recipes:

- appear in recipe library
- open in recipe detail
- can be added to meal planner
- ingredients flow into shopping list generation

## Local Commands

```bash
npm run dev
npm run lint
npm test
npm run build
npm run start
```

## PWA Testing

### Local production-mode test

1. `npm run build`
2. `npm run start`
3. Open `http://localhost:3000` in Chrome
4. Chrome DevTools -> Application -> Manifest
5. Chrome DevTools -> Application -> Service Workers
6. Toggle offline mode in DevTools and verify offline fallback appears on navigation
7. Run Lighthouse PWA audit (optional)

### Production test (Vercel)

1. Deploy to Vercel
2. Open production URL in Chrome/Edge and verify installability
3. Verify Android Chrome install flow
4. Verify iOS Safari Add to Home Screen flow
5. Launch installed app and confirm standalone behavior
6. Verify login and Supabase redirects still work

PWA installability requires HTTPS in production. Vercel production deployments provide HTTPS by default.

## Supabase Setup Notes

1. Create a Supabase project.
2. Enable Email auth provider.
3. Run SQL scripts in `docs/supabase/`:
   - `profiles.sql`
   - `recipes.sql`
   - `recipes_spoonacular_import.sql`
   - `recipes_vision_scan.sql`
   - `meal_plans.sql`
   - `pantry_items.sql`
   - `shopping_lists.sql`
   - `shopping_list_items.sql`
   - `shopping_list_exports.sql`
4. Buckets:
   - `recipe-images` (public)
   - `recipe-scans` (private, created/configured in `recipes_vision_scan.sql`)

## Deployment (Vercel)

1. Import the repo into Vercel.
2. Add production environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SPOONACULAR_API_KEY` (server-only)
   - `OPENAI_API_KEY` (server-only)
   - `OPENAI_RECIPE_SCAN_MODEL` (optional)
   - `INSTACART_API_KEY` (server-only)
   - `INSTACART_API_BASE_URL` (server-only)
3. Deploy.
4. In Supabase Auth settings, update URLs:
   - **Site URL** should match your Vercel production domain.
   - **Redirect URLs** must include your Vercel domain (and preview domains if used).

Example production redirect host:

- `https://your-project.vercel.app`

## Production Readiness Checklist

- `npm run lint` passes
- `npm run build` passes
- Environment variables set in Vercel
- `SPOONACULAR_API_KEY` is set in Vercel project settings
- `OPENAI_API_KEY` is set in Vercel project settings
- `OPENAI_RECIPE_SCAN_MODEL` set in Vercel if overriding default model
- `INSTACART_API_KEY` is set in Vercel project settings
- `INSTACART_API_BASE_URL` is set in Vercel project settings
- Supabase variables are set in Vercel project settings
- Supabase Auth redirect URLs updated with deployed domain
- Supabase storage bucket `recipe-scans` exists and policies are configured
- Existing Spoonacular import still works after deploy
- Core MVP flow manually verified

See full QA coverage in [CHECKLIST.md](./CHECKLIST.md).
See Instacart integration details in [docs/integrations/instacart.md](./docs/integrations/instacart.md).

## Phase Roadmap

- Phase 1: Auth (complete)
- Phase 2: Recipes (complete)
- Phase 3: Meal Planner (complete)
- Phase 4: Shopping List (complete)
- Phase 5: UX polish, accessibility, responsiveness, and production readiness (complete)
- Phase 6: Pantry MVP (complete)
- Phase 7: Suggested next focus: meal-planning efficiency features (recurring meals, planner shortcuts, smarter defaults)
