# BrandFlow AI — Handoff & Roadmap

## 1. Current state

BrandFlow AI is a Next.js web application for AI-assisted social media/content workflow management.

The repository is connected to Vercel and the `main` branch is the production source.

A separate Supabase project named **BrandFlow AI** was created for this application. Its project ref is `xeweudswxeiccexvcfex` and its URL is `https://xeweudswxeiccexvcfex.supabase.co`.

The old Supabase project **enuh1381-star's Project** was paused to free the user's free-project slot. **YKS Arena** is a separate project and must not be used for BrandFlow.

The BrandFlow database schema/migrations already exist in `supabase/` and cover, among other things:
- user profiles
- media assets/storage
- generated content/history/favorites
- scheduled posts/calendar
- marketing advisor reports
- cashflow
- social connections
- automatic publishing scheduler
- database hardening/RLS improvements

## 2. Important environment-variable situation

Do NOT put real secrets in GitHub.

The repository `.env` / `.env.example` files are placeholder manifests and may contain empty values intentionally.

BrandFlow production must have these environment variables configured in the hosting environment (Vercel):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `GROQ_API_KEY` (when Groq generation is used)
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET` (needed for scheduler endpoint protection)
- Instagram/social integration variables when those features are enabled

The most common recent diagnosis was that Rocket can see placeholder/empty `.env` values and report "API key missing" even when the actual hosting environment may be configured differently. Treat Rocket's static env-variable warning as a clue, not proof that a production variable is absent.

The code in `lib/supabase/server.ts` intentionally returns `null` when the Supabase URL/key is unavailable, so missing runtime variables can cause database-backed routes to fail without necessarily breaking the shell UI.

## 3. Recent fixes already completed

- Vercel/Next.js deployment configuration was repaired.
- Public/review mode was made safer when Clerk secrets are unavailable.
- Clerk initialization was guarded for preview/review mode.
- Navigation was improved, including the Publish Center.
- Content creation flow was expanded with platform-aware inputs, editable AI caption, preview, and calendar transfer.
- History labels/UI were localized to Turkish.
- AI assistant notice persistence was improved.
- GitHub PRs from the Rocket workflow were merged where appropriate.

Do not re-do these fixes without verifying the current `main` state first.

## 4. Current critical gap

The application now has its own BrandFlow Supabase project, but production integration must be verified end-to-end:

1. Vercel production environment has the correct Supabase URL and keys.
2. The database schema/migrations are fully applied.
3. RLS policies work with the chosen authentication model.
4. Database-backed routes return real data instead of `null` / empty states.
5. AI/API integrations are present in the hosting environment.
6. Scheduler secrets are configured before enabling automatic publishing.

## 5. Immediate next work

### Phase A — Make production actually functional

- Verify every required Vercel environment variable.
- Verify BrandFlow Supabase migration state.
- Test CRUD for profiles, media assets, generated content, history, favorites, scheduled posts, marketing advisor reports and cashflow.
- Test API routes from production, not only page rendering.
- Remove any review-mode behavior from the real production path where it is no longer needed.
- Verify Clerk authentication in production.

### Phase B — AI generation reliability

- Verify `GROQ_API_KEY` and model configuration in Vercel.
- Test `/api/create-assistant` and other AI routes with success and failure cases.
- Add clear user-facing errors when AI providers are unavailable.
- Ensure fallback content never hides a real provider failure silently.

### Phase C — Social publishing

- Verify social account connection flow.
- Verify access-token storage is server-only.
- Configure Instagram/Facebook/TikTok/LinkedIn/YouTube integrations as supported by the current code.
- Test scheduled publish, failed publish, retries, status transitions and external post IDs.
- Configure `CRON_SECRET` and the Supabase Vault values required by the automatic publishing scheduler before activating it.

### Phase D — Product quality

- Audit every sidebar route: `/analytics`, `/calendar`, `/media`, `/marketing-advisor`, `/publish`, `/cashflow`, `/opportunities`, `/company-doctor`, `/history`, `/profiles`, `/image-studio`, `/video-studio`.
- Check all buttons/forms for real actions, not placeholders.
- Check empty states, loading states, error states and permission states.
- Test desktop and mobile layouts.
- Fix any inconsistent Turkish/English text.

### Phase E — Security

- Never commit secrets.
- Confirm Supabase service-role key is never exposed to client bundles.
- Review RLS on every user-owned table.
- Keep social access tokens server-side only.
- Verify admin routes and protected routes are authenticated/authorized.
- Review Vercel and Supabase security advisories after schema changes.

### Phase F — Billing / launch readiness

- Define Free vs Premium limits.
- Implement server-side usage/quota enforcement.
- Confirm billing state cannot be trusted from the client.
- Add onboarding and first-value flow.
- Add analytics/event tracking for core funnel steps.
- Prepare a launch checklist and production rollback procedure.

## 6. Rules for the next AI agent

- Start by reading this file and `README.md`.
- Work from `main` unless explicitly told otherwise.
- Before changing code, inspect the existing implementation and avoid duplicate fixes.
- Never request or paste real secrets into GitHub.
- Do not use the **YKS Arena** Supabase project for BrandFlow.
- When Rocket reports missing API keys, first distinguish between a placeholder manifest warning and a real runtime configuration failure.
- Prefer small, testable changes and verify production behavior after each major fix.

## 7. Definition of done

BrandFlow is ready to launch when:

- production login works;
- every core page loads without server/runtime errors;
- database CRUD works for a real authenticated user;
- AI generation works with a real provider key;
- media upload/storage works;
- calendar/scheduling works;
- social publishing works for configured platforms;
- automatic publishing works safely with authenticated cron calls;
- RLS and server-only secrets are verified;
- billing/usage limits are enforced server-side;
- critical UX paths work on desktop and mobile.

## 8. Verified state — 2026-09-09

The production deployment was rechecked after the previous auth, Supabase and Groq configuration work:

- Clerk email sign-in works in production.
- Groq content generation works with `GROQ_TEXT_MODEL=openai/gpt-oss-120b`.
- Calendar create and refresh persistence works with the restored BrandFlow Supabase project (`xeweudswxeiccexvcfex`).
- Supabase and Clerk keys must remain configured in Vercel for the Production environment; never copy them into source control.

The follow-up reliability patch in `fix/integration-errors` adds:

- same-origin Instagram OAuth redirects and safe user-facing callback statuses;
- configuration validation for Instagram storage, encryption, redirect URL and Supabase service access;
- calendar storage error classification for connection, credentials, schema and permission failures without leaking secrets;
- readiness that only reports automatic publishing as ready when a supported account, active scheduler and `CRON_SECRET` are all present;
- regression tests for these cases.

Remaining launch blockers identified by the audit:

- TikTok, X/Twitter, LinkedIn and YouTube social adapters are still placeholders in the current code and must not be presented as working integrations.
- Instagram/Facebook automatic publishing still requires a real connected account, Vault/token encryption setup and a verified cron deployment.
- The full authenticated browser flow should be rechecked after the next production deployment, especially Instagram connect/cancel/error paths and calendar create/update/delete.

The local landing-page follow-up adds a public `/` marketing page with the BrandFlow value proposition, feature cards, workflow and product preview. Authenticated users are redirected to the protected `/dashboard` command center, while the existing sign-in and sign-up routes remain available from the landing page. The sidebar now links to `/dashboard` so the public home page and the application home are separate.
