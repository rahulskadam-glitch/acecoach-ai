from __future__ import annotations

import sys
import unittest
import json
from pathlib import Path


API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from analysis_engine.ontology_reasoner import _canonical_level, _dosage, _evaluate_fault_evidence, _fault_candidates, _validated_self_best_contrast
from ontology_runtime.acecoach_ontology.coaching_engine import compile_visual_story, insight_priority
from ontology_runtime.acecoach_ontology.loader import OntologyBundle


ONTOLOGY_ROOT = API_ROOT / "ontology" / "v4.1.0"


class OntologyReasoningContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.bundle = OntologyBundle.load(ONTOLOGY_ROOT)

    def test_priority_weights_are_configuration_driven(self) -> None:
        candidate = {"performance_impact": 1.0, "coachability": 1.0}
        self.assertEqual(insight_priority(candidate, {"performance_impact": 0.25, "coachability": 0.75}), 1.0)
        self.assertAlmostEqual(sum(self.bundle.insight_reasoner["priority_formula"]["weights"].values()), 1.0)

    def test_every_insight_archetype_has_an_intentional_story(self) -> None:
        expected = {
            "PROGRESS_SHIFT": "TREND_ARC",
            "REGRESSION_OR_PLATEAU": "TREND_ARC",
            "LIMITATION": "TRANSPARENT_LIMITATION",
        }
        for archetype, story in expected.items():
            compiled = compile_visual_story({"insight_id": archetype, "archetype": archetype}, self.bundle.visual_story_compiler)
            self.assertEqual(compiled["archetype"], story)

    def test_unknown_archetype_is_not_silently_rendered_as_cause_effect(self) -> None:
        with self.assertRaisesRegex(ValueError, "No visual story mapping"):
            compile_visual_story({"insight_id": "X", "archetype": "UNKNOWN_NEW_TYPE"}, self.bundle.visual_story_compiler)

    def test_product_levels_map_to_canonical_reasoning_profiles(self) -> None:
        profiles = self.bundle.level_analysis_profiles
        self.assertEqual(_canonical_level("new", profiles), "beginner")
        self.assertEqual(_canonical_level("competitive", profiles), "advanced")
        self.assertEqual(_canonical_level("coach_professional", profiles), "elite")
        self.assertEqual(_canonical_level("unexpected", profiles), "developing")

    def test_all_drills_have_level_specific_expectations(self) -> None:
        expected_levels = set(self.bundle.context_ontology["profile_modifiers"]["level"])
        for drill in self.bundle.drills.values():
            self.assertEqual(set(drill["level_adjustments"]), expected_levels)
        sample = next(iter(self.bundle.drills.values()))
        self.assertNotEqual(_dosage(sample, "beginner"), _dosage(sample, "elite"))

    def test_mobile_story_contract_is_explicit(self) -> None:
        mobile = self.bundle.visual_story_compiler["mobile_viewport_contract"]
        self.assertGreaterEqual(mobile["minimum_tap_target_px"], 44)
        self.assertLessEqual(mobile["maximum_caption_lines"], 2)

    def test_shared_root_construct_has_valid_actions_and_visual_story(self) -> None:
        contract = self.bundle.cross_stroke_constructs
        self.assertGreaterEqual(contract["minimum_distinct_actions"], 2)
        self.assertGreaterEqual(contract["minimum_sessions_per_action"], 2)
        compiled = compile_visual_story(
            {"insight_id": "SHARED", "archetype": "SHARED_ROOT_CONSTRUCT"},
            self.bundle.visual_story_compiler,
        )
        self.assertEqual(compiled["archetype"], "SHARED_ROOT_MAP")

    def test_visual_story_prototype_uses_keypoint_fixture(self) -> None:
        examples = ONTOLOGY_ROOT / "examples"
        fixture = json.loads((examples / "visual_story_keypoints.synthetic.json").read_text(encoding="utf-8"))
        prototype = (examples / "visual_story_prototype.js").read_text(encoding="utf-8")
        self.assertEqual(set(fixture["repetitions"]), {"self_best", "current"})
        self.assertEqual(len(fixture["repetitions"]["self_best"]), 3)
        self.assertTrue(all(len(frame["landmarks"]) >= 12 for frame in fixture["repetitions"]["current"]))
        self.assertIn("B6_CLEAN", prototype)
        self.assertIn("confidence", prototype)
        self.assertIn("noise", prototype)

    def test_load_tactical_and_transition_contracts_fail_closed(self) -> None:
        self.assertIn("injury diagnosis", self.bundle.load_pattern_policy["do_not_claim"])
        self.assertIn("validated_ball_tracking", self.bundle.tactical_companion_ontology["required_base_capabilities"])
        self.assertEqual(self.bundle.cohort_benchmark_registry["validated_numeric_cohorts"], [])
        self.assertTrue(self.bundle.skill_transition_policy["minimum_requirements"]["validated_level_cohort_required"])

    def test_fault_requires_a_compatible_measured_metric(self) -> None:
        fault = self.bundle.get_fault("FH-LOAD-01")
        missing = _evaluate_fault_evidence(fault, [{"id": "loading", "evidenceRecords": []}], "side")
        self.assertFalse(missing["eligible"])
        self.assertIn("no_compatible_measured_metric", missing["reasons"])

        supported = _evaluate_fault_evidence(fault, [{
            "id": "loading", "score": 52, "confidence": .88, "measurementBasis": "world_pose_angle_proxy",
            "evidenceRecords": [{"metricId": "knee_flexion_deg", "value": 4.2, "deviation": "low"}],
        }], "side")
        self.assertTrue(supported["eligible"])
        self.assertEqual([item["metricId"] for item in supported["matchedEvidence"]], ["knee_flexion_deg"])

    def test_fault_fails_closed_for_camera_and_direction_mismatch(self) -> None:
        fault = self.bundle.get_fault("FH-LOAD-01")
        area = [{
            "id": "loading", "score": 52, "confidence": .88, "measurementBasis": "world_pose_angle_proxy",
            "evidenceRecords": [{"metricId": "knee_flexion_deg", "value": 30.0, "deviation": "high"}],
        }]
        wrong_direction = _evaluate_fault_evidence(fault, area, "side")
        self.assertFalse(wrong_direction["eligible"])
        self.assertIn("measured_direction_does_not_support_fault", wrong_direction["reasons"])
        wrong_camera = _evaluate_fault_evidence(fault, area, "top_down")
        self.assertFalse(wrong_camera["eligible"])
        self.assertIn("camera_not_supported", wrong_camera["reasons"])

    def test_self_best_divergence_requires_validated_outcome_labels(self) -> None:
        unlabeled = [{"knowledgeMetrics": {"knee_flexion_deg": {"value": 10, "eventTimeMs": 400}}} for _ in range(4)]
        self.assertIsNone(_validated_self_best_contrast(unlabeled, {"knee_flexion_deg"}))
        labelled = [
            {"outcomeLabel": "success", "knowledgeMetrics": {"knee_flexion_deg": {"value": 24, "eventTimeMs": 400}}},
            {"outcomeLabel": "in_target", "knowledgeMetrics": {"knee_flexion_deg": {"value": 22, "eventTimeMs": 410}}},
            {"outcomeLabel": "weak", "knowledgeMetrics": {"knee_flexion_deg": {"value": 7, "eventTimeMs": 400}}},
            {"outcomeLabel": "out_of_target", "knowledgeMetrics": {"knee_flexion_deg": {"value": 9, "eventTimeMs": 420}}},
        ]
        divergence = _validated_self_best_contrast(labelled, {"knee_flexion_deg"})
        self.assertIsNotNone(divergence)
        self.assertEqual(divergence["metric_id"], "knee_flexion_deg")
        self.assertEqual(divergence["support_rate"], 1.0)

    def test_non_discriminative_pose_evidence_does_not_choose_a_fault(self) -> None:
        areas = [{
            "id": "body_position", "label": "Body stability", "score": 50, "confidence": .86,
            "measurementBasis": "2d_pose_stability_proxy",
            "evidenceRecords": [{"metricId": "head_displacement_body_ratio", "value": .18, "deviation": "high"}],
        }]
        profile = self.bundle.level_analysis_profiles["profiles"]["developing"]
        ranked, _evaluations, rejected = _fault_candidates("two_handed_backhand", "side", areas, .86, [], profile)
        self.assertEqual(ranked, [])
        ambiguous = [item for item in rejected if "non_discriminative_evidence" in item["reasons"]]
        self.assertGreaterEqual(len(ambiguous), 2)


if __name__ == "__main__":
    unittest.main()
