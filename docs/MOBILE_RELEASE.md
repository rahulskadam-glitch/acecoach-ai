# Athlentra Tennis mobile release

The iOS and Android projects wrap the deployed Next.js application so the web, native, analysis, and reporting experiences remain one product.

## Required configuration

1. Deploy the Next.js application to an HTTPS domain.
2. Set `NEXT_PUBLIC_APP_URL` to that origin in the hosted application.
3. Add these Supabase Auth redirect URLs:
   - `https://YOUR_DOMAIN/auth/callback`
   - `athlentratennis://auth/callback`
4. Enable only configured providers in `NEXT_PUBLIC_AUTH_PROVIDERS`, for example `google,apple`.
5. Set `CAPACITOR_SERVER_URL=https://YOUR_DOMAIN` before syncing a store build.

## Sync and open

```bash
CAPACITOR_SERVER_URL=https://YOUR_DOMAIN npm run mobile:sync:store
npm run mobile:open:ios
npm run mobile:open:android
```

The unconfigured native build intentionally shows a setup screen instead of silently shipping a localhost URL.

## Store prerequisites

- Apple Developer and Google Play Console accounts
- App records using `com.athlentra.tennis`
- Apple Sign in with Apple capability and Supabase provider credentials
- Google OAuth clients for web, iOS, and Android
- Release signing certificates / keystore stored outside Git
- Final support, privacy, and terms URLs
- App Store privacy answers and Google Play Data Safety answers validated against production behavior
- Real-device tests for recording, library selection, upload, OAuth callback, analysis completion, report playback, deletion, and sign-out

Do not commit signing keys, provider secrets, service-role keys, or App Store Connect credentials.
