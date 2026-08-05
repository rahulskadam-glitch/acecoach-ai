# Phase 1 Foundation

## Completed in this refactor
- Supabase SSR browser/server clients using `@supabase/ssr`.
- Next.js 16 `proxy.ts` session refresh and protected-route redirects.
- Stable signup, login, logout, OAuth callback, forgot-password, and update-password flows.
- User-facing action errors instead of uncaught Server Action 500 pages.
- Correct `/signup` and `/signup/success` route separation.
- Correct dashboard navigation to implemented routes.
- Database foreign keys, cascade behavior, roles, profile bootstrap trigger, explicit RLS, and private video storage policies.
- Environment template, centralized app config, structured logger, global error UI.
- Provider-agnostic AI interface and router skeleton.
- Lint and production build verification.

## Supabase setup
Run migrations in order in the SQL Editor:
1. `supabase/001_init.sql`
2. `supabase/002_rls_and_storage.sql` only if it has not already been run
3. `supabase/003_phase1_foundation.sql`

For local development, email confirmation may be disabled. For production, enable it and configure a dedicated SMTP provider.

For Google OAuth, enable Google in Supabase Auth and add:
`http://localhost:3000/auth/callback`
to the allowed redirect URLs.

## Acceptance tests
1. New user signs up and is either sent to dashboard or verification success depending on Auth configuration.
2. Confirmed user signs in and reaches `/dashboard`.
3. Signed-out access to `/dashboard`, `/upload`, or `/profile` redirects to `/login`.
4. Session survives browser refresh.
5. Sign out clears the session and returns to login.
6. Password reset callback reaches `/update-password`.
7. One user cannot read another user's profile, videos, analysis rows, or storage objects.
