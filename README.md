# Weapon — Strength Tracker

Next.js app with Clean Architecture. Tracks workouts, XP/ranks, goals, and profile with a gamified RPG-style progression system.

## Stack

- **Next.js 15** (App Router), TypeScript strict
- **TanStack Query** + **Zustand** for state management
- **Supabase** (normalized PostgreSQL, anon key, no auth)
- **Canvas charts** (hand-drawn, no chart library)

## Getting Started

```bash
npm install
cp .env.local.example .env.local  # fill in Supabase credentials
npm run dev
```

## Architecture

```
app/           → App Router shell (layout, page, globals.css)
src/domain/    → Pure business logic (types, catalogue, ranks, metrics, format)
src/application/ → Ports (interfaces) + use-cases (grouped by concern)
src/infrastructure/supabase/ → Supabase client + repository implementations
src/hooks/     → React hooks (TanStack Query, Zustand store, selectors)
src/ui/        → React components (1:1 port of legacy UI) + canvas chart lib
supabase/      → DB schema + migration scripts
```

## Deploy

Deployed on **Vercel**. Set environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON`

## Database

Run `supabase/schema.sql` then `supabase/settings.sql` in Supabase SQL Editor to set up tables.
