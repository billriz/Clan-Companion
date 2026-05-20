# Clan Companion

Clan Companion is a recipe planning web app built with Next.js App Router, TypeScript,
Tailwind CSS, shadcn/ui-style components, lucide-react, and Supabase Auth.

Phase 1 includes:

- Email/password login and signup
- Supabase SSR session persistence
- Protected `/dashboard` routing
- Auth-page redirects for signed-in users
- Logout
- A responsive dashboard shell with desktop sidebar and mobile bottom navigation
- Placeholder cards for Recipes, Meal Planner, and Shopping List

## Environment Variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Supabase SQL

Run the SQL in `docs/supabase/profiles.sql` from the Supabase SQL editor to add
the Phase 1 profiles table and row level security policies.
