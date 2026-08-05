# Install AceCoach AI v5.0.0

1. Back up the current `C:\workspace\web` folder and `.env.local`.
2. Stop the Next.js and Python processes.
3. Replace the entire `C:\workspace\web` folder with the `web` folder from the v5 ZIP.
4. Restore `.env.local`.
5. In Supabase SQL Editor, run `supabase/021_review_led_trust_platform_v500.sql` after migration 020.
6. Run:

```powershell
cd C:\workspace\web
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm run typecheck
npm run lint
npm run test:analysis
npm run verify:v5
npm run dev
```

7. Open `http://localhost:3000/version`. It must show **5.0.0** and **Review-Led Athlete Improvement**.

## Rollback

- Stop the services.
- Restore the backed-up v4 `web` folder and `.env.local`.
- Migration 021 is additive. Leaving its tables/columns in place does not change v4 reads. Do not drop them automatically if any v5 support requests or checksum values have been created.

## Verification queries

```sql
select column_name
from information_schema.columns
where table_schema='public'
  and table_name='videos'
  and column_name='sha256_checksum';

select to_regclass('public.support_requests'),
       to_regclass('public.analysis_job_events');
```
