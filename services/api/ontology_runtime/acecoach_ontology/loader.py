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
    overlay_recipes: Dict[str, Any]
    confidence_policy: Dict[str, Any]
    scoring_profiles: Dict[str, Any]
    camera_suitability: Dict[str, Any]
    research_sources: Dict[str, Dict[str, Any]]
    observation_taxonomy: Dict[str, Any]
    context_ontology: Dict[str, Any]
    stroke_library: Dict[str, Any]
    benchmark_policy: Dict[str, Any]
    diagnostic_engine: Dict[str, Any]
    coaching_language: Dict[str, Any]
    visual_coaching_grammar: Dict[str, Any]
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
            overlay_recipes=cls._read(root/'config/overlay_recipes.json'),
            confidence_policy=cls._read(root/'config/confidence_policy.json'),
            scoring_profiles=cls._read(root/'config/scoring_profiles.json'),
            camera_suitability=cls._read(root/'config/camera_suitability.json'),
            research_sources={x['source_id']: x for x in cls._read(root/'config/research_sources.json')},
            observation_taxonomy=cls._read(root/'config/observation_taxonomy.json'),
            context_ontology=cls._read(root/'config/context_ontology.json'),
            stroke_library=cls._read(root/'config/stroke_library.json'),
            benchmark_policy=cls._read(root/'config/benchmark_policy.json'),
            diagnostic_engine=cls._read(root/'config/diagnostic_engine.json'),
            coaching_language=cls._read(root/'config/coaching_language.json'),
            visual_coaching_grammar=cls._read(root/'config/visual_coaching_grammar.json'),
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
