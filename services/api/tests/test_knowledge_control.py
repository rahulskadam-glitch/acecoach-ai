from __future__ import annotations

import sys
import unittest
from copy import deepcopy
from pathlib import Path


API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from analysis_engine.knowledge_control import KnowledgeControlError, compile_knowledge_control
from ontology_runtime.acecoach_ontology.loader import OntologyBundle


ONTOLOGY_ROOT = API_ROOT / "ontology" / "v4.1.0"


def _minimal_controlled_call(policy: dict) -> dict:
    """Build the smallest valid compile_knowledge_control() call for a policy dict.

    No technical findings or numeric benchmark claimed, so this exercises only the
    knowledge-control trace and contracts block, not the fault/recommendation gates.
    """
    policy_version = str(policy.get("version") or "")
    scoring_policy_id = str(policy["scoring"]["policy_id"])
    recommendation_policy_id = str(policy["recommendations"]["policy_id"])
    insight_policy_id = str(policy["domains"]["insights"]["policy_ids"][0])
    benchmark_policy_id = str(policy["benchmarks"]["policy_id"])

    def scored(**extra):
        return {"knowledgeControlled": True, "policyId": scoring_policy_id, "policyVersion": policy_version, **extra}

    def insighted(**extra):
        return {"knowledgeControlled": True, "policyId": insight_policy_id, "policyVersion": policy_version, **extra}

    def recommended(**extra):
        return {"knowledgeControlled": True, "policyId": recommendation_policy_id, "policyVersion": policy_version, **extra}

    return compile_knowledge_control(
        policy=policy,
        ontology_version="test-ontology",
        manifest_hash="test-manifest",
        score_status="not_provisional",
        phase_scores=[scored()],
        metric_scores=[scored()],
        capture_quality=scored(),
        coaching_areas=[],
        repetition_insights=scored(),
        ontology_reasoning=None,
        strengths=[],
        priorities=[],
        drills=[],
        visual_moments=[],
        coach_summary=insighted(),
        performance_story=insighted(),
        coaching_playbook=recommended(),
        next_session=recommended(),
        practice_plan=recommended(),
        reference_comparison={"knowledgeControlled": True, "policyId": benchmark_policy_id, "policyVersion": policy_version, "status": "collecting"},
    )


class LongitudinalContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.bundle = OntologyBundle.load(ONTOLOGY_ROOT)

    def test_policy_declares_belief_lifecycle_thresholds(self) -> None:
        longitudinal = self.bundle.analysis_control_policy["longitudinal"]
        self.assertGreater(longitudinal["minimum_status_confidence"], 0)
        self.assertLessEqual(longitudinal["minimum_status_confidence"], 1)
        self.assertGreaterEqual(longitudinal["sustained_stable_sessions_for_solved"], 1)
        self.assertGreaterEqual(longitudinal["retention_window_sessions"], 1)

    def test_contract_emits_belief_lifecycle_fields(self) -> None:
        result = _minimal_controlled_call(self.bundle.analysis_control_policy)
        longitudinal = result["contracts"]["longitudinal"]
        policy_longitudinal = self.bundle.analysis_control_policy["longitudinal"]
        self.assertEqual(longitudinal["minimumStatusConfidence"], policy_longitudinal["minimum_status_confidence"])
        self.assertEqual(longitudinal["sustainedStableSessionsForSolved"], policy_longitudinal["sustained_stable_sessions_for_solved"])
        self.assertEqual(longitudinal["retentionWindowSessions"], policy_longitudinal["retention_window_sessions"])

    def test_fails_closed_when_a_belief_lifecycle_field_is_missing(self) -> None:
        policy = deepcopy(self.bundle.analysis_control_policy)
        del policy["longitudinal"]["minimum_status_confidence"]
        with self.assertRaises(KeyError):
            _minimal_controlled_call(policy)


if __name__ == "__main__":
    unittest.main()
