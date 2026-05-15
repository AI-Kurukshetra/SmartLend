# SmartLend

A Next.js lending platform with Supabase backend.

## Prerequisites

- Node.js 20+
- npm

## Getting Started

1. **Clone the repo**

   ```bash
   git clone https://github.com/AI-Kurukshetra/SmartLend.git
   cd SmartLend
   ```

2. **Install dependencies**

   ```bash
   npm ci
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and fill in your Supabase credentials:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Running Checks Locally

These are the same checks that run in CI:

```bash
# Lint
npm run lint

# Type-check
npm run typecheck

# Production build
npm run build
```

## CI Pipeline

GitHub Actions runs on every push to `main` and on all pull requests targeting `main`.

Workflow file: `.github/workflows/ci.yml`

**Steps:**

1. Install dependencies (`npm ci`)
2. Lint (`npm run lint`)
3. Type-check (`npm run typecheck`)
4. Build (`npm run build`)

All three steps must pass before a PR can be merged.

## Project Structure

```
app/          Next.js App Router pages and layouts
components/   Reusable UI components
hooks/        Custom React hooks
lib/          Utility functions and Supabase client
types/        Shared TypeScript types
supabase/     Supabase migrations and config
public/       Static assets
docs/         Project documentation
```

## Tech Stack

- [Next.js 16](https://nextjs.org) — framework
- [React 19](https://react.dev) — UI
- [TypeScript](https://www.typescriptlang.org) — type safety
- [Supabase](https://supabase.com) — database and auth
- [Framer Motion](https://www.framer.com/motion/) — animations
