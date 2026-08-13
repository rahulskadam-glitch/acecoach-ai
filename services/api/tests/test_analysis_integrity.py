from __future__ import annotations

import math
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from analysis_engine.biomechanics import compute_frame_metrics, score_from_measurements
from analysis_engine.biomechanical_profile import METRIC_SPECS, PROFILE_VERSION, build_biomechanical_profile
from analysis_engine.classifier import classify_movement
from analysis_engine.frame_types import PoseFrame
from analysis_engine.experience import coaching_playbook, repetition_insights
from analysis_engine.pipeline import AnalysisPipeline, ENGINE_VERSION, _stroke_technical_audit, _two_handed_backhand_audit, _two_handed_backhand_framework
from analysis_engine.sport_rules import build_coaching
from analysis_engine.signal_analytics import robust_outlier_indices, smooth_signal
from analysis_engine.temporal import RepetitionWindow, detect_repetitions
from analysis_engine.video import VideoMetadata


def point(x: float, y: float, z: float = 0.0) -> dict[str, float]:
    return {"x": x, "y": y, "z": z, "visibility": 0.98}


def synthetic_frame(index: int, fps: float = 30.0) -> PoseFrame:
    # Two smooth hitting-arm actions separated by a quiet interval. The body
    # remains fully visible and the world/image observations are deterministic.
    cycle = index % 60
    phase = min(1.0, max(0.0, (cycle - 12) / 24.0))
    swing = 0.5 - 0.5 * math.cos(math.pi * phase)
    if cycle > 36:
        swing = 1.0
    wrist_x = 0.40 + 0.30 * swing
    wrist_y = 0.58 - 0.08 * math.sin(math.pi * phase)

    image = {
        "nose": point(0.50, 0.18),
        "left_shoulder": point(0.43, 0.34),
        "right_shoulder": point(0.57, 0.34),
        "left_elbow": point(0.40, 0.48),
        "right_elbow": point(0.57 + 0.08 * swing, 0.47),
        "left_wrist": point(0.38, 0.58),
        "right_wrist": point(wrist_x, wrist_y),
        "left_hip": point(0.45, 0.58),
        "right_hip": point(0.55, 0.58),
        "left_knee": point(0.45, 0.76),
        "right_knee": point(0.56, 0.75 - 0.03 * swing),
        "left_ankle": point(0.43, 0.94),
        "right_ankle": point(0.59, 0.94),
        "left_foot_index": point(0.39, 0.96),
        "right_foot_index": point(0.63, 0.96),
    }
    world = {
        name: point((value["x"] - 0.5) * 1.8, (value["y"] - 0.58) * 1.8, 0.03 * swing)
        for name, value in image.items()
    }
    return PoseFrame(
        frame_index=index,
        timestamp_seconds=round(index / fps, 6),
        landmarks=image,
        world_landmarks=world,
        mean_visibility=0.98,
        core_visibility=0.98,
        brightness=0.52,
        contrast=0.72,
        blur_score=180.0,
        body_box={"left": 0.38, "top": 0.18, "right": 0.70, "bottom": 0.94, "width": 0.32, "height": 0.76},
        edge_clipping=False,
    )


class AnalysisIntegrityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fps = 30.0
        self.frames = [synthetic_frame(index, self.fps) for index in range(120)]

    def test_repetition_detection_is_deterministic(self) -> None:
        first_signal, first_windows = detect_repetitions(self.frames, self.fps, "right")
        second_signal, second_windows = detect_repetitions(self.frames, self.fps, "right")
        self.assertEqual(first_signal.tolist(), second_signal.tolist())
        self.assertEqual(first_windows, second_windows)

    def test_unconfirmed_movement_never_receives_a_score(self) -> None:
        result = compute_frame_metrics(self.frames, self.fps, "right")
        overall, phases, _metrics, _confidence, status = score_from_measurements(result, "forehand", False)
        self.assertIsNone(overall)
        self.assertEqual(status, "pending_movement_confirmation")
        self.assertTrue(all(item["score"] is None for item in phases))

    def test_same_measurements_produce_same_score(self) -> None:
        first = compute_frame_metrics(self.frames, self.fps, "right")
        second = compute_frame_metrics(self.frames, self.fps, "right")
        self.assertEqual(first.aggregate_metrics, second.aggregate_metrics)
        self.assertEqual(first.timeline, second.timeline)
        self.assertEqual(
            score_from_measurements(first, "forehand", True),
            score_from_measurements(second, "forehand", True),
        )

    def test_pipeline_completes_with_synthetic_pose_frames(self) -> None:
        with tempfile.NamedTemporaryFile(delete=False) as temporary:
            video_path = Path(temporary.name)
        metadata = VideoMetadata(
            path=video_path,
            content_hash="a" * 64,
            fps=self.fps,
            frame_count=len(self.frames),
            width=1280,
            height=720,
            duration_seconds=len(self.frames) / self.fps,
        )
        payload = SimpleNamespace(
            video_url="https://storage.example.com/video.mp4",
            expected_content_hash=None,
            sport_id="tennis",
            action_type="forehand",
            confirmed_action_type="forehand",
            dominant_side="right",
            age_band="19_29",
            playing_level="developing",
            primary_goal="Improve repeatability",
            camera_angle="side",
            shot_situation="controlled_practice",
            shot_intent="consistency",
            athlete_question="How can I create more space at contact?",
            height_cm=178.0,
        )

        with (
            patch("analysis_engine.pipeline.download_video", return_value=metadata),
            patch("analysis_engine.pipeline.extract_pose_frames", return_value=self.frames),
        ):
            result = AnalysisPipeline().analyze(payload)

        self.assertEqual(result["engine_manifest"]["engineVersion"], ENGINE_VERSION)
        self.assertEqual(result["engine_manifest"]["biomechanicalProfileVersion"], PROFILE_VERSION)
        self.assertEqual(result["frame_summary"]["biomechanicalProfile"]["metricCount"], 106)
        self.assertEqual(len(result["frame_summary"]["biomechanicalProfile"]["metrics"]), 106)
        self.assertEqual(len(result["frame_summary"]["biomechanicalProfile"]["linkages"]), 6)
        self.assertEqual(result["frame_summary"]["analysisContext"]["shotSituation"], "controlled_practice")
        self.assertEqual(result["frame_summary"]["analysisContext"]["source"], "athlete_supplied")
        self.assertEqual(result["frame_summary"]["athleteCalibration"]["heightCm"], 178.0)
        self.assertEqual(result["frame_summary"]["athleteCalibration"]["status"], "height_aware")
        self.assertEqual(len(result["frame_summary"]["bodyRegionReview"]), 8)
        self.assertEqual(result["frame_summary"]["bodyRegionReview"][2]["status"], "needs_confirmation")
        self.assertEqual(len(result["coach_summary"]["executiveBullets"]), 4)
        self.assertIn("pyramidSummary", result["coach_summary"])
        self.assertEqual(result["engine_manifest"]["ontologyVersion"], "4.1.0")
        self.assertEqual(len(result["engine_manifest"]["ontologyManifestHash"]), 64)
        self.assertIsNotNone(result["next_generation_story"])
        self.assertTrue(result["next_generation_story"]["insightId"].startswith("ONTO-FH-"))
        self.assertEqual(result["next_generation_story"]["playerCoaching"]["languageProfileId"], "PLAYER_COACH_v4.1")
        self.assertGreaterEqual(len(result["next_generation_story"]["visualStory"]["beats"]), 5)
        self.assertEqual(result["ontology_reasoning"]["ontologyVersion"], "4.1.0")
        self.assertIn("confidence_policy", result["ontology_reasoning"]["policiesApplied"])
        self.assertIn(result["priorities"][0]["faultId"], result["ontology_reasoning"]["evaluatedFaultIds"])
        self.assertEqual(len(result["drills"]), 3)
        self.assertEqual(len({drill["id"] for drill in result["drills"]}), 3)
        self.assertEqual(result["drills"][0]["ontologyVersion"], "4.1.0")
        chapter_ids = {item["chapterId"] for item in result["ontology_reasoning"]["findings"]}
        self.assertIn("weight_transfer", chapter_ids)
        self.assertEqual(len(result["ontology_reasoning"]["movementChain"]), 6)
        self.assertEqual(
            {item["chapterId"] for item in result["ontology_reasoning"]["findings"]}
            | {item["chapterId"] for item in result["ontology_reasoning"]["strengthReview"]},
            {"setup", "movement_spacing", "weight_transfer", "swing_connection", "contact_stability", "finish_recovery"},
        )
        self.assertIsInstance(result["coach_summary"]["pyramidSummary"]["strengths"], list)
        self.assertIsInstance(result["coach_summary"]["pyramidSummary"]["improvements"], list)
        self.assertIn("firstAction", result["coach_summary"]["pyramidSummary"])
        forehand_audit = result["coach_summary"]["pyramidSummary"]["audit"]
        self.assertEqual(len(forehand_audit["checkpoints"]), 7)
        self.assertTrue(forehand_audit["version"].startswith("complete-tennis-stroke-guide-v1.0.0"))
        self.assertTrue(all(item["bodyChecks"] for item in forehand_audit["checkpoints"]))
        self.assertIn("athlete-supplied-complete-stroke-guide", {item["id"] for item in result["evidence"]})
        self.assertIn("full-video pattern", result["coach_summary"]["pyramidSummary"]["synthesisNote"])
        self.assertIn("supplied by the athlete", result["coach_summary"]["contextStatement"])
        self.assertIn("coaching_playbook", result)
        self.assertIn("repetition_insights", result)
        self.assertFalse(video_path.exists())

    def test_biomechanical_registry_has_exact_phase_distribution(self) -> None:
        expected = {
            "preparation": 16,
            "backswing": 18,
            "loading": 18,
            "acceleration": 22,
            "contact": 16,
            "follow_through": 16,
        }
        self.assertEqual(len(METRIC_SPECS), 106)
        self.assertEqual(len({metric.id for metric in METRIC_SPECS}), 106)
        self.assertEqual(
            {phase: sum(metric.phase == phase for metric in METRIC_SPECS) for phase in expected},
            expected,
        )

    def test_two_handed_backhand_framework_is_four_stage_and_camera_honest(self) -> None:
        areas = [
            {"id": "backlift_preparation", "status": "strength", "timestampSeconds": 0.4},
            {"id": "footwork_base", "status": "priority", "timestampSeconds": 0.2},
            {"id": "lower_body_loading", "status": "developing", "timestampSeconds": 0.8},
            {"id": "lower_body_extension", "status": "developing", "timestampSeconds": 1.0},
            {"id": "hand_swing_path", "status": "developing", "timestampSeconds": 1.0},
            {"id": "contact_spacing", "status": "developing", "timestampSeconds": 1.2},
            {"id": "body_position", "status": "priority", "timestampSeconds": 1.2},
            {"id": "ending_position", "status": "priority", "timestampSeconds": 1.6},
        ]
        framework = _two_handed_backhand_framework("two_handed_backhand", areas)

        self.assertEqual([item["step"] for item in framework], [1, 2, 3, 4])
        self.assertEqual([item["label"] for item in framework], ["Preparation", "Power position & drop", "Contact", "Finish & recovery"])
        self.assertEqual([item["status"] for item in framework], ["priority", "developing", "priority", "priority"])
        self.assertIn("Grip change", framework[0]["cameraBoundary"])
        self.assertIn("racket tracking", framework[1]["cameraBoundary"])
        self.assertIn("hand force", framework[2]["cameraBoundary"])
        self.assertIn("exact racket finish", framework[3]["cameraBoundary"])
        self.assertEqual([len(item["checks"]) for item in framework], [5, 5, 7, 5])
        self.assertEqual(framework[0]["checks"][2]["status"], "confirm")
        self.assertIn("weight percentage", framework[1]["checks"][0]["cameraBoundary"])
        self.assertIn("exact ball contact", framework[2]["checks"][4]["cameraBoundary"])
        self.assertEqual(framework[2]["checks"][2]["status"], "confirm")
        self.assertEqual(framework[2]["checks"][6]["status"], "confirm")
        self.assertIn("top", framework[2]["checks"][2]["label"].lower())
        self.assertIn("above the nose line", framework[3]["checks"][3]["finding"])
        self.assertIn("below the hand line", framework[1]["checks"][3]["finding"])

    def test_two_handed_backhand_audit_maps_reference_into_seven_body_part_phases(self) -> None:
        areas = [
            {"id": "backlift_preparation", "status": "strength", "timestampSeconds": 0.4},
            {"id": "footwork_base", "status": "priority", "timestampSeconds": 0.2},
            {"id": "lower_body_loading", "status": "developing", "timestampSeconds": 0.8},
            {"id": "lower_body_extension", "status": "developing", "timestampSeconds": 1.0},
            {"id": "hand_swing_path", "status": "developing", "timestampSeconds": 1.0},
            {"id": "contact_spacing", "status": "strength", "timestampSeconds": 1.2},
            {"id": "body_position", "status": "priority", "timestampSeconds": 1.2},
            {"id": "ending_position", "status": "priority", "timestampSeconds": 1.6},
        ]
        audit = _two_handed_backhand_audit(
            "two_handed_backhand",
            areas,
            {"shotSituation": "defensive_on_run", "shotIntent": "consistency"},
        )

        self.assertIsNotNone(audit)
        assert audit is not None
        self.assertEqual(audit["version"], "two-handed-backhand-reference-rubric-v2.0.0")
        self.assertEqual([item["step"] for item in audit["checkpoints"]], list(range(1, 8)))
        self.assertEqual([item["label"] for item in audit["checkpoints"]], ["Ready position", "Preparation / unit turn", "Load and drop", "Forward swing", "Contact", "Follow-through / finish", "Recovery"])
        self.assertEqual(audit["checkpoints"][0]["status"], "priority")
        self.assertEqual(audit["checkpoints"][1]["status"], "priority")
        self.assertIn("open or outside-leg", audit["checkpoints"][1]["contextNote"])
        self.assertIn("consistency or depth", audit["checkpoints"][4]["contextNote"])
        self.assertIn("Exact weight", audit["checkpoints"][2]["cameraBoundary"])
        self.assertIn("racket-head finish", audit["checkpoints"][5]["cameraBoundary"])
        self.assertTrue(all(len(item["bodyChecks"]) == 5 for item in audit["checkpoints"]))
        self.assertIn("Top/non-dominant hand", audit["checkpoints"][3]["bodyChecks"][0]["finding"])
        self.assertIn("force", audit["checkpoints"][3]["bodyChecks"][0]["cameraBoundary"])
        self.assertIn("one professional silhouette", audit["stylePrinciple"])
        source_ids = {source_id for item in audit["checkpoints"] for source_id in item["sourceIds"]}
        self.assertEqual(
            source_ids,
            {
                "athlete-supplied-complete-stroke-guide",
                "venus-williams-backhand-fundamentals",
                "athlete-supplied-backhand-phase-rubric",
                "mouratoglou-fluid-backhand",
                "top-tennis-training-three-step-backhand",
                "coach-adri-two-handed-backhand-masterclass",
                "nathan-pasha-five-step-backhand",
                "tennis-tv-atp-backhand-variations",
            },
        )
        self.assertIsNone(_two_handed_backhand_audit("serve", areas, {}))

    def test_complete_stroke_guide_is_applied_to_every_supported_tennis_stroke(self) -> None:
        areas = [
            {
                "id": area_id,
                "status": "developing",
                "timestampSeconds": 0.5,
                "observation": f"Measured {area_id.replace('_', ' ')} pattern.",
                "measurementBasis": "pose_estimate",
            }
            for area_id in (
                "footwork_base",
                "backlift_preparation",
                "lower_body_loading",
                "lower_body_extension",
                "body_position",
                "hand_swing_path",
                "contact_spacing",
                "ending_position",
                "repeatability",
            )
        ]
        expected_phase_counts = {
            "forehand": 7,
            "one_handed_backhand": 7,
            "two_handed_backhand": 7,
            "slice": 6,
            "serve": 8,
            "forehand_volley": 6,
            "backhand_volley": 5,
            "overhead": 6,
        }

        for action_type, phase_count in expected_phase_counts.items():
            with self.subTest(action_type=action_type):
                audit = _stroke_technical_audit(action_type, areas, {"statement": "Controlled practice."})
                self.assertIsNotNone(audit)
                assert audit is not None
                self.assertEqual(len(audit["checkpoints"]), phase_count)
                self.assertEqual([item["step"] for item in audit["checkpoints"]], list(range(1, phase_count + 1)))
                self.assertTrue(all(item["bodyChecks"] for item in audit["checkpoints"]))
                self.assertTrue(any(check["status"] == "confirm" for item in audit["checkpoints"] for check in item["bodyChecks"]))
                source_ids = {source_id for item in audit["checkpoints"] for source_id in item["sourceIds"]}
                self.assertIn("athlete-supplied-complete-stroke-guide", source_ids)

    def test_two_handed_backhand_scores_knee_load_and_drive_as_separate_events(self) -> None:
        result = compute_frame_metrics(self.frames, self.fps, "right")
        _overall, _phases, metrics, _confidence, _status = score_from_measurements(result, "two_handed_backhand", True)
        scored = {item["id"]: item for item in metrics}

        self.assertIn("lower_body_loading", scored)
        self.assertIn("lower_body_extension", scored)
        self.assertIn("load event", scored["lower_body_loading"]["explanation"])
        self.assertIn("loading into follow-through", scored["lower_body_extension"]["explanation"])

    def test_biomechanical_profile_is_deterministic_and_camera_honest(self) -> None:
        result = compute_frame_metrics(self.frames, self.fps, "right")
        _overall, phases, _metrics, confidence, _status = score_from_measurements(result, "forehand", True)
        first = build_biomechanical_profile(result, "forehand", phases, confidence)
        second = build_biomechanical_profile(result, "forehand", phases, confidence)
        self.assertEqual(first, second)
        self.assertEqual(first["metricCount"], 106)
        self.assertGreater(first["availableMetricCount"], 80)
        self.assertEqual(len(first["phases"]), 6)
        self.assertEqual(len(first["linkages"]), 6)
        self.assertIn("not force", first["measurementStatement"])



    def test_legacy_world_com_speed_cannot_change_score(self) -> None:
        result = compute_frame_metrics(self.frames, self.fps, "right")
        baseline = score_from_measurements(result, "forehand", True)
        for frame in result.frame_metrics:
            frame["comSpeedWorldPerSecond"] = 99999.0
            frame["comShapeSpeedWorldPerSecond"] = 99999.0
        result.aggregate_metrics["comSpeedWorldPerSecond"] = {"mean": 99999.0, "max": 99999.0}
        result.aggregate_metrics["comShapeSpeedWorldPerSecond"] = {"mean": 99999.0, "max": 99999.0}
        self.assertEqual(baseline, score_from_measurements(result, "forehand", True))

    def test_full_clip_head_range_cannot_override_primary_repetition_score(self) -> None:
        result = compute_frame_metrics(self.frames, self.fps, "right")
        baseline = score_from_measurements(result, "forehand", True)
        result.aggregate_metrics["headHorizontalImageRange"] = {"range": 1000.0, "mean": 500.0}
        result.aggregate_metrics["headVerticalImageRange"] = {"range": 1000.0, "mean": 500.0}
        self.assertEqual(baseline, score_from_measurements(result, "forehand", True))

    def test_unsupported_sport_never_receives_technique_score(self) -> None:
        result = compute_frame_metrics(self.frames, self.fps, "right")
        overall, phases, metrics, _confidence, status = score_from_measurements(
            result,
            "forehand",
            True,
            "badminton",
        )
        self.assertIsNone(overall)
        self.assertEqual(status, "blocked_unsupported_sport")
        self.assertTrue(all(item["score"] is None for item in phases))
        self.assertEqual([item["id"] for item in metrics], ["video_measurability"])

    def test_improvement_plan_is_deterministic_and_actionable(self) -> None:
        result = compute_frame_metrics(self.frames, self.fps, "right")
        _overall, phases, metrics, confidence, status = score_from_measurements(result, "forehand", True)
        first = build_coaching("tennis", "forehand", metrics, phases, result.timeline, confidence, status, "u14", "intermediate")
        second = build_coaching("tennis", "forehand", metrics, phases, result.timeline, confidence, status, "u14", "intermediate")
        self.assertEqual(first, second)
        performance_story = first[8]
        visual_moments = first[9]
        measurement_coverage = first[10]
        practice_plan = first[11]
        self.assertIn("nextMilestone", performance_story)
        self.assertGreaterEqual(len(visual_moments), 1)
        self.assertGreaterEqual(len(measurement_coverage["measured"]), 1)
        self.assertEqual(len(practice_plan["sessions"]), 4)
        self.assertTrue(all(item["successMetric"] for item in practice_plan["sessions"]))

    def test_review_led_repetition_insights_are_deterministic_and_not_a_percentile(self) -> None:
        repetitions = [
            {"index": 0, "startSeconds": 0.2, "durationSeconds": 1.1, "peakMotion": 1.4, "meanVisibility": 0.93, "headMovementRange": 0.06},
            {"index": 1, "startSeconds": 2.0, "durationSeconds": 1.15, "peakMotion": 1.35, "meanVisibility": 0.91, "headMovementRange": 0.07},
        ]
        first = repetition_insights(repetitions)
        second = repetition_insights(repetitions)
        self.assertEqual(first, second)
        self.assertIn("self-consistency", first["explanation"])
        self.assertIn("not a technique grade or age-group percentile", first["explanation"])
        self.assertIsNotNone(first["clearestReferenceRepetition"])

    def test_coaching_playbook_keeps_one_priority_and_athlete_goal(self) -> None:
        priorities = [{
            "title": "Contact spacing",
            "finding": "The hitting arm is crowded at the likely contact proxy.",
            "nextStep": "Create visible space beside the torso.",
            "cue": "Meet the ball beside you.",
        }]
        drills = [{"successMetric": "8 of 10 repetitions preserve visible spacing."}]
        playbook = coaching_playbook(
            "two_handed_backhand",
            {"mainPriority": "Contact spacing"},
            priorities,
            drills,
            "Improve backhand control",
        )
        self.assertEqual(playbook["todayFocus"], "Contact spacing")
        self.assertEqual(playbook["athleteGoal"], "Improve backhand control")
        self.assertIn("Improve backhand control", playbook["transferChallenge"])
        self.assertEqual(playbook["successTest"], drills[0]["successMetric"])

    def test_signal_analytics_are_deterministic_and_detect_outlier(self) -> None:
        import numpy as np
        raw = np.asarray([0.0, 0.1, 0.4, 1.2, 0.5, 0.1, 0.0, 0.2, 1.1, 0.3, 0.0], dtype=float)
        first = smooth_signal(raw, 30.0)
        second = smooth_signal(raw, 30.0)
        self.assertEqual(first.tolist(), second.tolist())
        self.assertEqual(robust_outlier_indices([1.0, 1.03, 0.98, 4.8]), [3])

    def test_repetition_insights_include_rhythm_and_phase_analytics(self) -> None:
        repetitions = [
            {"index": 0, "startFrame": 0, "endFrame": 30, "startSeconds": 0.0, "durationSeconds": 1.0, "peakMotion": 1.2, "meanVisibility": 0.95, "phaseTimeline": [{"phase": "ready", "frameIndex": 0}, {"phase": "loading", "frameIndex": 10}, {"phase": "contact_proxy", "frameIndex": 20}, {"phase": "recovery", "frameIndex": 26}]},
            {"index": 1, "startFrame": 40, "endFrame": 72, "startSeconds": 1.4, "durationSeconds": 1.07, "peakMotion": 1.18, "meanVisibility": 0.93, "phaseTimeline": [{"phase": "ready", "frameIndex": 40}, {"phase": "loading", "frameIndex": 51}, {"phase": "contact_proxy", "frameIndex": 62}, {"phase": "recovery", "frameIndex": 68}]},
        ]
        result = repetition_insights(repetitions)
        self.assertIsNotNone(result["rhythmProfile"])
        self.assertGreater(len(result["phaseTiming"]), 0)
        self.assertEqual(result, repetition_insights(repetitions))

    def test_classifier_requires_confirmation_when_label_conflicts(self) -> None:
        _, windows = detect_repetitions(self.frames, self.fps, "right")
        if not windows:
            windows = [RepetitionWindow(0, 8, 30, 48, 1.0, 0.98)]
        classification = classify_movement(self.frames, windows, "tennis", "serve", "right")
        if classification.detected_action != "unknown" and classification.detected_action != "serve":
            self.assertTrue(classification.mismatch)
            self.assertTrue(classification.requires_confirmation)


if __name__ == "__main__":
    unittest.main()
