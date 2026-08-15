from __future__ import annotations
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict

class OntologyError(RuntimeError):
    pass

@dataclass(frozen=True)
class OntologyBundle:
    root: Path
    manifest: Dict[str, Any]
    strokes: Dict[str, Any]
    phases: Dict[str, Any]
    faults: Dict[str, Dict[str, Any]]
    shared_faults: Dict[str, Dict[str, Any]]
    drills: Dict[str, Dict[str, Any]]
    confidence_policy: Dict[str, Any]
    camera_suitability: Dict[str, Any]
    research_sources: Dict[str, Dict[str, Any]]
    observation_taxonomy: Dict[str, Any]
    context_ontology: Dict[str, Any]
    stroke_library: Dict[str, Any]
    benchmark_policy: Dict[str, Any]
    diagnostic_engine: Dict[str, Any]
    coaching_language: Dict[str, Any]
    causal_graph: Dict[str, Any]
    video_analysis_protocol: Dict[str, Any]
    event_detection: Dict[str, Any]
    measurement_recipes: Dict[str, Any]
    stroke_analysis_playbooks: Dict[str, Any]
    multi_rep_analysis: Dict[str, Any]
    insight_reasoner: Dict[str, Any]
    visual_story_compiler: Dict[str, Any]
    player_feedback_policy: Dict[str, Any]
    model_quality_gates: Dict[str, Any]
    coach_language_sources: Dict[str, Any]
    stroke_coach_lexicon: Dict[str, Any]
    coach_storytelling: Dict[str, Any]
    natural_language_quality_gates: Dict[str, Any]
    coach_language_generation_protocol: Dict[str, Any]
    semantic_to_coach_language: Dict[str, Any]
    level_analysis_profiles: Dict[str, Any]
    cross_stroke_constructs: Dict[str, Any]
    load_pattern_policy: Dict[str, Any]
    tactical_companion_ontology: Dict[str, Any]
    cohort_benchmark_registry: Dict[str, Any]
    skill_transition_policy: Dict[str, Any]
    stroke_source_registry: Dict[str, Any]
    knowledge_validation_policy: Dict[str, Any]
    analysis_control_policy: Dict[str, Any]

    @staticmethod
    def _read(path: Path) -> Any:
        try:
            return json.loads(path.read_text(encoding='utf-8'))
        except Exception as exc:
            raise OntologyError(f'Unable to read {path}: {exc}') from exc

    @classmethod
    def load(cls, root: str | Path) -> 'OntologyBundle':
        root = Path(root)
        manifest = cls._read(root/'manifest.json')
        strokes = cls._read(root/'config/strokes.json')
        phases = cls._read(root/'config/phases.json')
        faults: Dict[str, Dict[str, Any]] = {}
        for path in sorted((root/'config/faults').glob('*.json')):
            for item in cls._read(path):
                fid = item['fault_id']
                if fid in faults:
                    raise OntologyError(f'Duplicate fault_id: {fid}')
                faults[fid] = item
        shared = {x['fault_id']: x for x in cls._read(root/'config/shared_faults.json')}
        drills = {x['drill_id']: x for x in cls._read(root/'config/drills.json')}
        bundle = cls(
            root=root, manifest=manifest, strokes=strokes, phases=phases,
            faults=faults, shared_faults=shared, drills=drills,
            confidence_policy=cls._read(root/'config/confidence_policy.json'),
            camera_suitability=cls._read(root/'config/camera_suitability.json'),
            research_sources={x['source_id']: x for x in cls._read(root/'config/research_sources.json')},
            observation_taxonomy=cls._read(root/'config/observation_taxonomy.json'),
            context_ontology=cls._read(root/'config/context_ontology.json'),
            stroke_library=cls._read(root/'config/stroke_library.json'),
            benchmark_policy=cls._read(root/'config/benchmark_policy.json'),
            diagnostic_engine=cls._read(root/'config/diagnostic_engine.json'),
            coaching_language=cls._read(root/'config/coaching_language.json'),
            causal_graph=cls._read(root/'config/causal_graph.json'),
            video_analysis_protocol=cls._read(root/'config/video_analysis_protocol.json'),
            event_detection=cls._read(root/'config/event_detection.json'),
            measurement_recipes=cls._read(root/'config/measurement_recipes.json'),
            stroke_analysis_playbooks=cls._read(root/'config/stroke_analysis_playbooks.json'),
            multi_rep_analysis=cls._read(root/'config/multi_rep_analysis.json'),
            insight_reasoner=cls._read(root/'config/insight_reasoner.json'),
            visual_story_compiler=cls._read(root/'config/visual_story_compiler.json'),
            player_feedback_policy=cls._read(root/'config/player_feedback_policy.json'),
            model_quality_gates=cls._read(root/'config/model_quality_gates.json'),
            coach_language_sources=cls._read(root/'config/coach_language_sources.json'),
            stroke_coach_lexicon=cls._read(root/'config/stroke_coach_lexicon.json'),
            coach_storytelling=cls._read(root/'config/coach_storytelling.json'),
            natural_language_quality_gates=cls._read(root/'config/natural_language_quality_gates.json'),
            coach_language_generation_protocol=cls._read(root/'config/coach_language_generation_protocol.json'),
            semantic_to_coach_language=cls._read(root/'config/semantic_to_coach_language.json'),
            level_analysis_profiles=cls._read(root/'config/level_analysis_profiles.json'),
            cross_stroke_constructs=cls._read(root/'config/cross_stroke_constructs.json'),
            load_pattern_policy=cls._read(root/'config/load_pattern_policy.json'),
            tactical_companion_ontology=cls._read(root/'config/tactical_companion_ontology.json'),
            cohort_benchmark_registry=cls._read(root/'config/cohort_benchmark_registry.json'),
            skill_transition_policy=cls._read(root/'config/skill_transition_policy.json'),
            stroke_source_registry=cls._read(root/'config/stroke_source_registry.json'),
            knowledge_validation_policy=cls._read(root/'config/knowledge_validation_policy.json'),
            analysis_control_policy=cls._read(root/'config/analysis_control_policy.json'),
        )
        bundle.validate_references()
        return bundle

    def validate_references(self) -> None:
        valid_markers = set(self._read(self.root/'config/overlay_markers.json'))
        for fid, f in self.faults.items():
            unknown = set(f.get('overlay_markers', [])) - valid_markers
            if unknown:
                raise OntologyError(f'{fid} uses unknown overlay markers: {sorted(unknown)}')
            for did in f.get('drill_ids', []):
                if did not in self.drills:
                    raise OntologyError(f'{fid} references missing drill {did}')
            for sid in f.get('source_ids', []):
                if sid not in self.research_sources:
                    raise OntologyError(f'{fid} references missing research source {sid}')
        priority = self.insight_reasoner.get('priority_formula', {})
        weights = priority.get('weights', {})
        if not weights or abs(sum(float(value) for value in weights.values()) - 1.0) > 1e-9:
            raise OntologyError('insight_reasoner priority weights must exist and sum to 1.0')
        archetypes = {item['id'] for item in self.insight_reasoner.get('insight_archetypes', [])}
        story_coverage = {
            archetype
            for story in self.visual_story_compiler.get('story_archetypes', {}).values()
            for archetype in story.get('use_for', [])
        }
        missing_stories = archetypes - story_coverage
        if missing_stories:
            raise OntologyError(f'Insight archetypes missing visual stories: {sorted(missing_stories)}')
        canonical_levels = set(self.context_ontology['profile_modifiers']['level'])
        configured_levels = set(self.level_analysis_profiles.get('profiles', {}))
        if configured_levels != canonical_levels:
            raise OntologyError(
                f'Level analysis profiles must match canonical levels: missing={sorted(canonical_levels-configured_levels)}, '
                f'unknown={sorted(configured_levels-canonical_levels)}'
            )
        for drill_id, drill in self.drills.items():
            if set(drill.get('level_adjustments', {})) != canonical_levels:
                raise OntologyError(f'{drill_id} must define adjustments for every canonical player level')
        stroke_ids = set(self.strokes)
        construct_ids: set[str] = set()
        for construct in self.cross_stroke_constructs.get('constructs', []):
            construct_id = construct['id']
            if construct_id in construct_ids:
                raise OntologyError(f'Duplicate cross-stroke construct: {construct_id}')
            construct_ids.add(construct_id)
            unknown_actions = set(construct.get('eligible_actions', [])) - stroke_ids
            if unknown_actions:
                raise OntologyError(f'{construct_id} uses unknown actions: {sorted(unknown_actions)}')
        for seed in self.cohort_benchmark_registry.get('qualitative_seeds', []):
            unknown_sources = set(seed.get('source_ids', [])) - set(self.research_sources)
            if unknown_sources:
                raise OntologyError(f"{seed.get('id')} uses unknown research sources: {sorted(unknown_sources)}")
        source_strokes = self.stroke_source_registry.get('strokes', {})
        if set(source_strokes) != stroke_ids:
            raise OntologyError(
                f'Stroke source registry must cover every supported stroke exactly: '
                f'missing={sorted(stroke_ids-set(source_strokes))}, unknown={sorted(set(source_strokes)-stroke_ids)}'
            )
        minimums = self.stroke_source_registry.get('minimum_coverage', {})
        minimum_tier_a = int(minimums.get('authority_tier_a_sources_per_stroke', 1))
        for stroke_id, coverage in source_strokes.items():
            source_ids = coverage.get('source_ids', [])
            if len(source_ids) != len(set(source_ids)):
                raise OntologyError(f'{stroke_id} source registry contains duplicate source IDs')
            unknown_sources = set(source_ids) - set(self.research_sources)
            if unknown_sources:
                raise OntologyError(f'{stroke_id} uses unknown research sources: {sorted(unknown_sources)}')
            sources = [self.research_sources[source_id] for source_id in source_ids]
            if sum(source.get('authority_tier') == 'A' for source in sources) < minimum_tier_a:
                raise OntologyError(f'{stroke_id} does not meet authority-tier-A source coverage')
            if not any('governing_body' in source.get('type', '') for source in sources):
                raise OntologyError(f'{stroke_id} has no governing-body source')
            if not any(
                source.get('type', '').startswith('peer_reviewed')
                or 'coaching_science' in source.get('type', '')
                for source in sources
            ):
                raise OntologyError(f'{stroke_id} has no peer-reviewed or coaching-science source')
        personal = self.knowledge_validation_policy.get('personal_baseline', {})
        cohort = self.knowledge_validation_policy.get('matched_cohort', {})
        if int(personal.get('minimum_prior_context_matched_sessions', 0)) < 2:
            raise OntologyError('Personal baseline requires repeated context-matched sessions')
        if int(cohort.get('minimum_athletes_per_cell', 0)) < 30:
            raise OntologyError('Matched cohorts must require at least 30 athletes per cell')
        if self.cohort_benchmark_registry.get('validated_numeric_cohorts'):
            raise OntologyError('Static validated cohorts are prohibited; runtime cohort versions must pass governance checks')
        control = self.analysis_control_policy
        if control.get('default_state') != 'fail_closed' or control.get('fail_closed') is not True:
            raise OntologyError('Analysis control policy must fail closed')
        if str(control.get('ontology_version')) != str(self.manifest.get('version')):
            raise OntologyError('Analysis control policy ontology version must match the manifest')
        required_domains = set(control.get('required_domains', []))
        domains = set(control.get('domains', {}))
        expected_domains = {'calculations', 'insights', 'recommendations', 'benchmarks', 'records', 'report'}
        if required_domains != expected_domains or domains != expected_domains:
            raise OntologyError('Analysis control policy must define every required control domain exactly')
        if any(not control['domains'][domain].get('policy_ids') for domain in expected_domains):
            raise OntologyError('Every analysis control domain must reference at least one policy ID')
        scoring = control.get('scoring', {})
        supported_actions = set(scoring.get('supported_actions', []))
        if supported_actions != stroke_ids:
            raise OntologyError(
                f'Analysis scoring policy must cover every supported stroke exactly: '
                f'missing={sorted(stroke_ids-supported_actions)}, unknown={sorted(supported_actions-stroke_ids)}'
            )
        scoring_phases = scoring.get('phases', [])
        phase_ids = [str(item.get('id')) for item in scoring_phases]
        if len(phase_ids) != len(set(phase_ids)) or len(phase_ids) != 7:
            raise OntologyError('Analysis scoring policy must define seven unique report phases')
        if abs(sum(float(item.get('weight', 0)) for item in scoring_phases) - 1.0) > 1e-9:
            raise OntologyError('Analysis scoring phase weights must sum to 1.0')
        capture_quality = scoring.get('capture_quality', {})
        capture_weights = capture_quality.get('weights', {})
        if set(capture_weights) != {'visibility', 'framing', 'body_scale', 'brightness', 'contrast', 'blur'}:
            raise OntologyError('Capture-quality policy must define every required component weight')
        if abs(sum(float(value) for value in capture_weights.values()) - 1.0) > 1e-9:
            raise OntologyError('Capture-quality weights must sum to 1.0')
        capture_grades = capture_quality.get('grade_minimums', {})
        grade_values = [float(capture_grades.get(key, -1)) for key in ('excellent', 'good', 'usable', 'limited')]
        if not 100 >= grade_values[0] > grade_values[1] > grade_values[2] > grade_values[3] >= 0:
            raise OntologyError('Capture-quality grade thresholds must be strictly descending inside 0-100')
        component_weight_groups = [
            scoring['components']['acceleration_control']['two_handed_backhand_blend'],
            scoring['components']['contact_spacing']['blend'],
            scoring['components']['finish_control'],
            scoring_phases[0]['component_weights'],
        ]
        for weights in component_weight_groups:
            if abs(sum(float(value) for value in weights.values()) - 1.0) > 1e-9:
                raise OntologyError('Analysis scoring component weights must sum to 1.0')
        area_status = scoring.get('coaching_area_status', {})
        if not 0 <= float(area_status.get('developing_minimum', -1)) < float(area_status.get('strength_minimum', -1)) <= 100:
            raise OntologyError('Coaching area status thresholds must be ordered inside the 0-100 score range')
        repetition = scoring.get('repetition_analysis', {})
        review_weight_total = sum(float(repetition.get(key, 0)) for key in (
            'review_visibility_weight', 'review_duration_fit_weight', 'review_peak_fit_weight'
        ))
        if abs(review_weight_total - 100.0) > 1e-9:
            raise OntologyError('Repetition review weights must sum to 100')
        candidate_ranking = control.get('recommendations', {}).get('candidate_ranking', {})
        impact_weights = candidate_ranking.get('impact_weights', {})
        if set(impact_weights) != set(AREA_ID for AREA_ID in (
            'footwork_base', 'backlift_preparation', 'contact_spacing', 'body_position',
            'lower_body_loading', 'lower_body_extension', 'hand_swing_path',
            'ending_position', 'repeatability'
        )) or any(float(value) <= 0 for value in impact_weights.values()):
            raise OntologyError('Recommendation candidate ranking must cover every coaching area with positive weights')
        unreleased_reference = control.get('benchmarks', {}).get('unreleased_reference', {})
        if unreleased_reference.get('status') != 'withheld_no_released_numeric_reference':
            raise OntologyError('Unreleased benchmarks must fail closed with the governed withheld status')
        record_fields = set(control.get('records', {}).get('required_trace_fields', []))
        if record_fields != {'status', 'policyVersion', 'ontologyVersion', 'manifestHash', 'domains'}:
            raise OntologyError('Analysis record policy must require the complete control trace')
        comparisons = control.get('comparisons', {})
        longitudinal = control.get('longitudinal', {})
        if float(comparisons.get('maximum_capture_score_difference', 0)) <= 0:
            raise OntologyError('Analysis comparison policy requires a positive capture-quality tolerance')
        if float(comparisons.get('improved_score_delta', 0)) <= 0:
            raise OntologyError('Analysis comparison policy requires a positive improvement threshold')
        if int(longitudinal.get('minimum_history_sessions', 0)) < 2:
            raise OntologyError('Longitudinal policy requires at least two prior sessions')
        if float(longitudinal.get('distribution_spread_divisor', 0)) <= 0:
            raise OntologyError('Longitudinal distribution spread divisor must be positive')

    def get_fault(self, fault_id: str) -> Dict[str, Any]:
        try:
            return self.faults[fault_id]
        except KeyError as exc:
            raise OntologyError(f'Unknown fault_id: {fault_id}') from exc

    def can_confirm_fault(self, *, fault_id: str, comparable_strokes: int,
                          measurement_confidence: float, interpretation_confidence: float,
                          camera_supported: bool, required_evidence_present: bool) -> bool:
        fault = self.get_fault(fault_id)
        policy = self.confidence_policy['confirmation_rule']
        return (
            comparable_strokes >= max(fault['minimum_comparable_strokes'], policy['minimum_comparable_strokes'])
            and measurement_confidence >= policy['minimum_measurement_confidence']
            and interpretation_confidence >= policy['minimum_interpretation_confidence']
            and camera_supported and required_evidence_present
        )
