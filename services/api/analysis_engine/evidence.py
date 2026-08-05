from __future__ import annotations

from typing import Any

EVIDENCE_VERSION = "tennis-evidence-registry-2026.08.3"

TENNIS_EVIDENCE: list[dict[str, Any]] = [
    {
        "id": "athlete-supplied-complete-stroke-guide",
        "title": "The Complete Tennis Stroke Technical Guide",
        "organization": "Athlete-supplied coaching and biomechanics synthesis",
        "year": 2026,
        "level": "coach_consensus",
        "scope": ["forehand", "backhand", "one_handed_backhand", "two_handed_backhand", "slice", "backhand_slice", "serve", "forehand_volley", "backhand_volley", "overhead", "kinetic_chain", "phase_model", "cross_stroke_faults"],
        "use": "Supplies a phase-by-phase reference for every supported tennis stroke, organized by feet and knees, hips and shoulders, hands and racket, and head and eyes. It also adds shared checks for head release, ground-up sequencing, complete follow-through, grip suitability, progressive acceleration, and recovery. AceCoach applies only camera-supported body-motion checks automatically; grip, racket face, pronation, spin, exact contact, and ball result remain confirmation-only without dedicated tracking.",
    },
    {
        "id": "athlete-supplied-backhand-phase-rubric",
        "title": "Two-Handed Backhand — Full Technical Breakdown",
        "organization": "Athlete-supplied coaching synthesis",
        "year": 2026,
        "level": "coach_consensus",
        "scope": ["two_handed_backhand", "phase_model", "unit_turn", "head_control", "non_dominant_hand", "knee_loading", "knee_extension", "kinetic_chain", "racket_path", "recovery"],
        "use": "Adds a seven-phase, body-part-by-body-part rubric. It explicitly separates knee loading from knee extension, treats head stillness through contact as a primary control checkpoint, and distinguishes the non-dominant hand's swing-path role from the dominant hand's stabilizing role. Grip pressure, hand force, racket face, and exact contact remain confirmation-only without dedicated sensors or racket-and-ball tracking.",
    },
    {
        "id": "venus-williams-backhand-fundamentals",
        "title": "How To Hit A Tennis Backhand With Venus Williams",
        "organization": "Venus Williams",
        "year": 2023,
        "level": "public_coaching_reference",
        "url": "https://www.youtube.com/watch?v=5M52JoEDtwY",
        "scope": ["two_handed_backhand", "grip", "unit_turn", "head_control", "stance", "recovery"],
        "use": "Supports simple player language around early whole-body turn, active adjustment steps, staying low, a forward contact intention, complete follow-through, recovery, and context-dependent closed or open stance. Grip details remain athlete-confirmed without a hand-and-racket view.",
    },
    {
        "id": "mouratoglou-fluid-backhand",
        "title": "7 Steps to a Fluid Two-Handed Backhand",
        "organization": "Patrick Mouratoglou",
        "year": 2021,
        "level": "public_coaching_reference",
        "url": "https://www.youtube.com/watch?v=WNnW9Dd2vMY",
        "scope": ["two_handed_backhand", "preparation", "grip_tension", "rhythm", "non_dominant_hand", "extension", "stance"],
        "use": "Supports early shoulder preparation, lower grip tension, a compact backswing with deeper forward extension, gravity-assisted racket flow, non-dominant-hand contribution, and open-stance use when it improves space and fluidity. Tension and racket-head behavior are confirmation-only in pose-only video.",
    },
    {
        "id": "top-tennis-training-three-step-backhand",
        "title": "Perfect Two Handed Backhand in 3 Steps",
        "organization": "Top Tennis Training",
        "year": 2024,
        "level": "public_coaching_reference",
        "url": "https://www.youtube.com/watch?v=i1k8MLOsOwI",
        "scope": ["two_handed_backhand", "preparation", "power_position", "contact_finish"],
        "use": "Provides the player-facing three-step coaching structure: early coil and movement, loaded power position with arm space, then forward contact, finish, and recovery. Grip and racket claims remain confirmation-only without racket tracking.",
    },
    {
        "id": "coach-adri-two-handed-backhand-masterclass",
        "title": "Two-handed Backhand Masterclass by ATP Coach Adri",
        "organization": "Tennisnerd / ATP Coach Adri",
        "year": 2025,
        "level": "public_coaching_reference",
        "url": "https://www.youtube.com/watch?v=X5YFyzx50CQ",
        "scope": ["two_handed_backhand", "grip", "non_dominant_hand", "footwork", "spacing", "racket_path", "recovery"],
        "use": "Supports non-dominant-hand-led acceleration, preparation while moving, stance-foot orientation that preserves rotation, context-adjusted take-back height, forward extension before the finish, committed recovery footwork, and repeatability over imitation of an extreme professional style.",
    },
    {
        "id": "nathan-pasha-five-step-backhand",
        "title": "Five Steps to an ATP Two-Handed Backhand",
        "organization": "Crunch Time Coaching / Nathan Pasha",
        "year": 2021,
        "level": "public_coaching_reference",
        "url": "https://www.youtube.com/watch?v=6cdC2cHfd28",
        "scope": ["two_handed_backhand", "grip", "unit_turn", "loading", "rhythm", "contact", "follow_through", "drills"],
        "use": "Supports grip flexibility, automatic grip-change rehearsal, relaxed arms, racket-head organization, progressive momentum from back leg to front, early ball recognition, a natural rather than manufactured follow-through, and constraint-based spin drills. Exact grip, ball brushing, and racket lag require confirmation or racket-and-ball tracking.",
    },
    {
        "id": "tennis-tv-atp-backhand-variations",
        "title": "Analysing ATP Tennis Players' Two-Handed Backhands",
        "organization": "Tennis TV",
        "year": 2021,
        "level": "public_coaching_reference",
        "url": "https://www.youtube.com/watch?v=xXw7ZZfdy7w",
        "scope": ["two_handed_backhand", "professional_variation", "stance", "spin", "direction", "defense", "recovery"],
        "use": "Documents valid professional variation across spin, direction, height, defensive reach, open or neutral stance, compact take-back, extension, and recovery. It is used to prevent one-size-fits-all ideal-shape claims, not as a statistical benchmark or a requirement to copy a professional player.",
    },
    {
        "id": "elliott-2006-biomechanics-tennis",
        "title": "Biomechanics and tennis",
        "organization": "British Journal of Sports Medicine",
        "year": 2006,
        "level": "peer_reviewed",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC2577481/",
        "scope": ["kinetic_chain", "technique_development", "injury_load"],
        "use": "Supports whole-chain interpretation and cautions against isolating one joint from the rest of the stroke.",
    },
    {
        "id": "lambrich-2023-groundstroke-review",
        "title": "Biomechanical analyses of different serve and groundstroke techniques in tennis",
        "organization": "Sports Biomechanics / systematic scoping review",
        "year": 2023,
        "level": "peer_reviewed",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10434869/",
        "scope": ["forehand", "backhand", "serve", "stance", "task_context"],
        "use": "Supports stroke-, stance-, direction-, and task-specific interpretation instead of one universal technical template.",
    },
    {
        "id": "kovacs-2011-eight-stage-serve",
        "title": "An 8-Stage Model for Evaluating the Tennis Serve",
        "organization": "Sports Health",
        "year": 2011,
        "level": "peer_reviewed",
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3445225/",
        "scope": ["serve", "phase_model", "coaching"],
        "use": "Provides a phase-based serve framework for preparation, acceleration, impact, deceleration, and finish.",
    },
    {
        "id": "itf-academy-coach-education",
        "title": "World Tennis Academy coach education",
        "organization": "International Tennis Federation",
        "year": 2026,
        "level": "governing_body",
        "url": "https://www.itf-academy.com/",
        "scope": ["coach_education", "player_development", "practice_design"],
        "use": "Governing-body context for development-appropriate coaching language and practice planning.",
    },
]


def evidence_for(sport_id: str, action_type: str) -> list[dict[str, Any]]:
    if sport_id != "tennis":
        return []
    relevant: list[dict[str, Any]] = []
    for item in TENNIS_EVIDENCE:
        scope = set(item.get("scope", []))
        if action_type in scope or "kinetic_chain" in scope or "coach_education" in scope:
            relevant.append(item)
    return relevant
