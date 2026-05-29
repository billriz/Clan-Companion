# GravyTime QA Checklist

Use this checklist before production releases.

## Auth

- [ ] Sign up works
- [ ] Login works
- [ ] Logout works
- [ ] Protected routes redirect unauthenticated users

## Recipes

- [ ] Create recipe
- [ ] Edit recipe
- [ ] Delete recipe
- [ ] Upload recipe image
- [ ] Recipe list/search/filter behaves correctly
- [ ] Add recipe to meal planner from recipe card/detail

## Meal Planner

- [ ] Add recipe to meal planner
- [ ] Remove meal from planner
- [ ] Navigate weeks (previous/current/next)
- [ ] Mobile day tabs are usable

## Shopping List

- [ ] Generate shopping list from planned meals
- [ ] Check/uncheck shopping item
- [ ] Add manual shopping item
- [ ] Delete shopping item
- [ ] Clear checked items
- [ ] Category grouping is correct

## Layout and Responsiveness

- [ ] Mobile layout verified at 360px
- [ ] Mobile layout verified at 390px
- [ ] Tablet layout verified
- [ ] Desktop layout verified
- [ ] No horizontal overflow
- [ ] Mobile bottom navigation does not cover content

## Build and Deployment

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Vercel environment variables are set:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Supabase Auth production redirect URLs include deployed Vercel domain
