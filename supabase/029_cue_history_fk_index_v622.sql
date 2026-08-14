-- AceCoach AI v6.2.2 — cover cue_history.user_id foreign key and athlete history reads.
-- Apply after migration 028.

create index if not exists cue_history_user_created_idx
  on public.cue_history(user_id, created_at desc);
