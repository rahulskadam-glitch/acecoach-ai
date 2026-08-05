# Install AceCoach AI v6.0.0

1. Stop the Next.js and Python services.
2. Back up `C:\workspace\web` and `.env.local`.
3. Replace the full `web` folder with the package `web` folder.
4. Restore `.env.local`.
5. Run `supabase/022_simple_athlete_journey_v600.sql` after migration 021.
6. Add configured OAuth providers to `NEXT_PUBLIC_AUTH_PROVIDERS`, for example:

   `NEXT_PUBLIC_AUTH_PROVIDERS=google,microsoft,facebook`

   Do not list a provider until it is enabled in Supabase and its external provider console.
7. Run:

   `npm install`

   `.\VERIFY_INSTALL_V600.ps1`

   `npm run dev`
8. Start the Python analysis API as before.
9. Open `http://localhost:3000/version` and confirm v6.0.0.

## Required environment values

The existing Supabase, service-role, analysis API, API-key, and video-host variables remain required. OAuth secrets stay in Supabase/provider configuration and must never be committed to this repository.
