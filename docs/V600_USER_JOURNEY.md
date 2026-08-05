# Six-step athlete journey

## 1. Sport

The root page contains only the AceCoach mark, one headline, one sentence, five sport cards, and minimal legal/help links. The sport is stored in a browser-visible sport cookie and an HTTP-only anonymous journey token. When migration 022 is available, the anonymous journey is also persisted server-side using a hashed token.

## 2. Sign in

Configured providers are read from `NEXT_PUBLIC_AUTH_PROVIDERS`. Buttons for Google, Apple, Microsoft/Azure, and Facebook remain hidden unless explicitly enabled. Email sign-in and signup remain available. OAuth callback destinations are restricted to local application paths.

## 3. Upload and describe

One screen combines video selection, capture guidance, mandatory movement selection, camera angle, age band, playing level, dominant side, goal, reference-body preference, and required processing consent. File checks cover format, size, duration, resolution, and orientation. Server analysis still owns deeper pose and capture-quality gates.

## 4. Analyze

The new processing page restores session state after refresh and starts a queued job only once. It displays server-confirmed states rather than a random percentage. Movement conflicts stop the flow and require explicit confirmation.

## 5. Report

The report contains four primary sections: Coach Summary, Watch and Compare, Your Improvements, and Practice Plan. The main correction appears once. Detailed metrics remain collapsed.

## 6. Coach

The coaching conversation is bound to one completed analysis session. The initial implementation uses a deterministic report-grounded response service. It refuses medical claims and unsupported measurements and never generates a new score.
