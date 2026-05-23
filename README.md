# PlatePlan

PlatePlan is a full-stack meal planning app built with Next.js App Router and Supabase.
It focuses on a clean MVP loop:

`Recipes -> Meal Planner -> Shopping List`

Phase 5 is focused on polish and production readiness: UX consistency, accessibility,
mobile refinement, and deployment preparation.

## MVP Features

- Authentication (email/password signup, login, logout)
- Protected app routes
- Recipe CRUD
- Spoonacular recipe browse + import into your recipe library
- Recipe image uploads
- Weekly meal planner
- Shopping list generation from planned meals
- Manual shopping list items
- Check/uncheck and clear checked shopping items
- Responsive mobile + desktop layout

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase (Auth, Postgres, Storage)
- shadcn/ui-style components
- lucide-react icons
- Vercel deployment target

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
```

Required variables for local and production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SPOONACULAR_API_KEY` (server-only, never `NEXT_PUBLIC_`)

After adding new environment variables, restart the dev server.

### 3. Start local development

```bash
npm run dev
```

Open `http://localhost:3000`.

## Local Commands

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Supabase Setup Notes

1. Create a Supabase project.
2. Enable Email auth provider.
3. Run SQL scripts in `docs/supabase/`:
   - `profiles.sql`
   - `recipes.sql`
   - `recipes_spoonacular_import.sql`
   - `meal_plans.sql`
   - `shopping_list_items.sql`
4. Create a storage bucket named `recipe-images` (public) for recipe images.

## Deployment (Vercel)

1. Import the repo into Vercel.
2. Add production environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SPOONACULAR_API_KEY` (server-only, no `NEXT_PUBLIC_` prefix)
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
- Supabase variables are set in Vercel project settings
- Supabase Auth redirect URLs updated with deployed domain
- Core MVP flow manually verified

See full QA coverage in [CHECKLIST.md](./CHECKLIST.md).

## Phase Roadmap

- Phase 1: Auth (complete)
- Phase 2: Recipes (complete)
- Phase 3: Meal Planner (complete)
- Phase 4: Shopping List (complete)
- Phase 5: UX polish, accessibility, responsiveness, and production readiness (complete)
- Phase 6: Suggested next focus: meal-planning efficiency features (recurring meals, planner shortcuts, smarter defaults)
