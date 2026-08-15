-- Athlentra Tennis v6.4.2 — prevent duplicate session-level expert labels.

create unique index if not exists expert_annotations_one_label_per_rater_idx
  on public.expert_annotations(study_id, analysis_session_id, coalesce(repetition_index, -1), annotator_ref);
