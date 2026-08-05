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
    context_model: Dict[str, Any]
    accessibility: Dict[str, Any]
    safeguarding: Dict[str, Any]
    longitudinal_model: Dict[str, Any]
    visual_grammar: Dict[str, Any]

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
            context_model=cls._read(root/'config/context_model.json'),
            accessibility=cls._read(root/'config/accessibility.json'),
            safeguarding=cls._read(root/'config/safeguarding.json'),
            longitudinal_model=cls._read(root/'config/longitudinal_model.json'),
            visual_grammar=cls._read(root/'config/visual_grammar.json'),
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

    def is_minor_age_band(self, age_band: str) -> bool:
        """Fail-closed per safeguarding.json: anything not explicitly an adult band is treated as a minor."""
        adult_bands = {'18_to_34', '35_to_54', '55_plus'}
        return age_band not in adult_bands

    def render_style_for_confidence(self, score: float) -> Dict[str, Any]:
        """Look up the confidence-band rendering rule (line style, opacity, badge) from visual_grammar.json
        for a given confidence score, matching the rules the video overlay engine must apply."""
        rendering = self.visual_grammar['confidence_rendering']
        if score >= rendering['high']['min_score']:
            return rendering['high']
        if score >= rendering['medium']['min_score']:
            return rendering['medium']
        return rendering['low_estimated']

    def color_token_for_marker(self, marker: str) -> str:
        """Resolve which color_token in visual_grammar.json a given overlay marker uses."""
        families = self.visual_grammar['marker_families']
        for family in families.values():
            if marker in family.get('members', []):
                color_map = family.get('color_map')
                if color_map:
                    return color_map.get(marker, color_map.get('default'))
                return family.get('default_color', 'structure_neutral')
        raise OntologyError(f'Unknown overlay marker: {marker}')

    def guardian_consent_required(self, age_band: str) -> bool:
        return self.is_minor_age_band(age_band)
