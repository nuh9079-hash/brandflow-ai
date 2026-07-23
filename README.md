# BrandFlow AI

BrandFlow AI is a simple AI content assistant for small businesses that want to create social media posts, ad copy, hashtags, visual ideas, and a 7-day sharing plan from one short product brief.

## Features

- Clerk authentication with Google and email/password login
- Protected dashboard via Next.js proxy middleware
- User avatar and logout controls
- Groq-powered one-click content generation
- Single main flow with product name, product description, brand tone, and target audience
- Automatic output sections for Instagram, TikTok, Reels, YouTube Shorts, Facebook, X / Twitter, LinkedIn, ads, Story, hashtags, visual prompts, and a 7-day content plan
- Copy button for every generated section
- Automatic generated-content history persistence with Supabase
- Favorites, history search, filtering, delete, open again, and copy flows
- Settings page for brand profile preferences
- Billing page with Free, Pro, and Business plan placeholders
- Simple dark interface focused on fast content creation

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Clerk Authentication
- Supabase Database
- Groq API

## Installation

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment Variables

Create `.env.local` from `.env.example` and fill real values locally. Never hardcode secrets in source files.

```env
GROQ_API_KEY=gsk_your_groq_key

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
CLERK_SECRET_KEY=sk_test_your_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
```

## Database Setup

Run the SQL file in Supabase SQL editor:

```text
supabase/schema.sql
```

Tables:

- `profiles`
- `generated_contents`
- `favorites`
- `history`

Every generated content row includes a `user_id` and belongs to a Clerk user.

## Folder Structure

```text
app/
  api/
    favorites/
    generate/
    history/
    profile/
    stats/
  billing/
  create/
  favorites/
  history/
  settings/
  sign-in/
  sign-up/
components/
  layout/
  ui/
lib/
  content-store.ts
  supabase/
supabase/
  schema.sql
```

## Core Routes

- `/` Main content creation flow
- `/create` Content creation
- `/history` Saved generated content
- `/favorites` Favorite content
- `/settings` Brand settings
- `/billing` Plan placeholders
- `/sign-in` Clerk sign in
- `/sign-up` Clerk sign up

## Future Roadmap

- Stripe subscription integration
- Credit usage enforcement
- Team workspaces
- Scheduled content calendar
- Image generation integration
- Multi-platform publishing workflows
- Production RLS policies mapped to Clerk JWT claims
