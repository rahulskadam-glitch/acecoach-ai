from __future__ import annotations

from typing import Any

from .evidence import EVIDENCE_VERSION, evidence_for

KNOWLEDGE_VERSION = f"tennis-coaching-rules-v1.0.0+{EVIDENCE_VERSION}"

AREA_DEFINITIONS: dict[str, dict[str, str]] = {
    "footwork_base": {
        "label": "Footwork and hitting base",
        "goal": "Arrive with enough space, create a stable base, and keep an exit route for recovery.",
        "cue": "Adjust, set, strike, recover.",
        "why": "Better spacing and base control reduce last-second compensations in the upper body.",
        "phase": "ready",
    },
    "body_position": {
        "label": "Body position and head control",
        "goal": "Keep the head quieter and the trunk organized through the key strike window.",
        "cue": "See it through; finish balanced.",
        "why": "Stable visual and postural control supports cleaner timing and directional control.",
        "phase": "contact_proxy",
    },
    "backlift_preparation": {
        "label": "Preparation and backlift timing",
        "goal": "Complete the turn and hand preparation early enough that the forward swing is not rushed.",
        "cue": "Turn first, swing second.",
        "why": "Earlier preparation creates more time for spacing, sequencing, and contact adjustment.",
        "phase": "preparation",
    },
    "lower_body_loading": {
        "label": "Lower-body load and transfer",
        "goal": "Use the legs to support balance and rotation rather than relying on the hitting arm alone.",
        "cue": "Load, push, then rotate.",
        "why": "A connected lower body can improve stability and distribute effort through the movement chain.",
        "phase": "loading",
    },
    "lower_body_extension": {
        "label": "Knee drive after loading",
        "goal": "Keep the knee bend as a distinct loading event, then extend the legs through the forward swing and into the finish.",
        "cue": "Load first; drive second.",
        "why": "Loading without a later drive leaves the legs passive; rising before the strike window removes the stable low-to-high platform.",
        "phase": "acceleration",
    },
    "hand_swing_path": {
        "label": "Swing rhythm and hand path",
        "goal": "Build speed progressively and travel smoothly through the intended contact corridor.",
        "cue": "Smooth in, fast through.",
        "why": "A repeatable acceleration pattern is easier to time than a sudden, arm-dominant hit.",
        "phase": "acceleration",
    },
    "contact_spacing": {
        "label": "Contact-spacing proxy",
        "goal": "Create enough room between the torso and hitting hand at the likely strike window.",
        "cue": "Arrive beside the ball, not underneath it.",
        "why": "More usable space can reduce crowding and help the racket travel through the target line.",
        "phase": "contact_proxy",
    },
    "ending_position": {
        "label": "Finish and recovery",
        "goal": "Complete the swing under control and begin the first recovery action without delay.",
        "cue": "Finish, reset, ready.",
        "why": "A controlled finish supports the next movement rather than leaving the athlete off balance.",
        "phase": "recovery",
    },
    "repeatability": {
        "label": "Repetition consistency",
        "goal": "Repeat the same movement rhythm and strike window across multiple attempts.",
        "cue": "Same shape, same tempo.",
        "why": "Repeatability makes technical changes measurable and easier to transfer into live play.",
        "phase": "contact_proxy",
    },
}

ACTION_EMPHASIS: dict[str, list[str]] = {
    "forehand": ["footwork_base", "backlift_preparation", "lower_body_loading", "lower_body_extension", "body_position", "hand_swing_path", "contact_spacing", "ending_position"],
    "backhand": ["footwork_base", "backlift_preparation", "lower_body_loading", "lower_body_extension", "body_position", "hand_swing_path", "contact_spacing", "ending_position"],
    "one_handed_backhand": ["footwork_base", "backlift_preparation", "lower_body_loading", "lower_body_extension", "body_position", "hand_swing_path", "contact_spacing", "ending_position"],
    "two_handed_backhand": ["footwork_base", "backlift_preparation", "lower_body_loading", "lower_body_extension", "body_position", "hand_swing_path", "contact_spacing", "ending_position"],
    "slice": ["footwork_base", "backlift_preparation", "lower_body_loading", "body_position", "hand_swing_path", "contact_spacing", "ending_position"],
    "backhand_slice": ["footwork_base", "backlift_preparation", "lower_body_loading", "body_position", "hand_swing_path", "contact_spacing", "ending_position"],
    "serve": ["footwork_base", "backlift_preparation", "lower_body_loading", "lower_body_extension", "body_position", "hand_swing_path", "contact_spacing", "ending_position", "repeatability"],
    "overhead": ["footwork_base", "backlift_preparation", "lower_body_loading", "lower_body_extension", "body_position", "hand_swing_path", "contact_spacing", "ending_position", "repeatability"],
    "forehand_volley": ["footwork_base", "backlift_preparation", "body_position", "contact_spacing", "ending_position", "repeatability"],
    "backhand_volley": ["footwork_base", "backlift_preparation", "body_position", "contact_spacing", "ending_position", "repeatability"],
}

ACTION_OVERRIDES: dict[str, dict[str, dict[str, str]]] = {
    "forehand": {
        "backlift_preparation": {
            "goal": "Turn the shoulders early, organize the hitting hand without rushing, and use the non-hitting arm to preserve spacing.",
            "cue": "Turn together; separate late.",
            "why": "Early organization creates time for adjustment steps and a cleaner forward swing.",
        },
        "contact_spacing": {
            "goal": "Meet the likely strike window beside and slightly ahead of the hitting-side hip with usable arm space.",
            "cue": "Create space, then meet it in front.",
            "why": "Crowding reduces the available acceleration path and makes direction control harder.",
        },
        "lower_body_loading": {
            "goal": "Plant a usable anchor and flex the knees to the ball height before the forward rotation begins.",
            "cue": "Plant first; load under the ball.",
            "why": "The plant gives hip rotation a stable anchor and separates loading from the later leg drive.",
        },
        "lower_body_extension": {
            "goal": "Drive the legs after loading while staying supported through the likely strike window.",
            "cue": "Load first; drive through second.",
            "why": "A load-then-drive sequence connects the ground to the hips instead of asking the hitting arm to create all the speed.",
        },
        "body_position": {
            "goal": "Keep the head quiet through the likely strike window while the hips and shoulders rotate underneath it.",
            "cue": "See the hit before you look up.",
            "why": "Early head movement changes timing and the racket's delivery corridor at the same moment.",
        },
        "hand_swing_path": {
            "goal": "Let the hips initiate, then build arm and hand speed progressively through the strike corridor.",
            "cue": "Hips lead; hand follows fast.",
            "why": "Ground-up sequencing creates a longer, more repeatable acceleration path than an arm-only hit.",
        },
        "ending_position": {
            "goal": "Allow a complete grip- and spin-appropriate finish without wrist collapse or deliberate deceleration.",
            "cue": "Brush through; finish free.",
            "why": "A continuous finish is evidence that the racket travelled through the ball instead of chopping or stopping at contact.",
        },
    },
    "backhand": {
        "backlift_preparation": {
            "goal": "Complete the shoulder turn early enough to present the back shoulder toward the incoming ball before the forward swing.",
            "cue": "Show the back shoulder, then go.",
            "why": "A complete early turn supports spacing and prevents an arm-only, late backhand.",
        },
        "body_position": {
            "goal": "Keep the head and trunk organized as the hitting arm travels forward, avoiding early opening away from the strike corridor.",
            "cue": "Stay sideways through the window.",
            "why": "Premature trunk opening can pull the hand path across the ball and reduce stability.",
        },
        "contact_spacing": {
            "goal": "Create a clearly forward contact window with enough room for the hitting arm to extend without reaching or collapsing.",
            "cue": "Step to space; meet it early.",
            "why": "One-handed backhands typically need more forward space than forehands to preserve structure and control.",
        },
    },
    "two_handed_backhand": {
        "footwork_base": {
            "goal": "Recognize the backhand early, split and pivot into efficient movement, adjust into usable spacing, and choose a stance that fits the ball and leaves a recovery route.",
            "cue": "Read, pivot, move, space.",
            "why": "Efficient movement creates time; the best stance depends on ball width, height, pace, direction, and available recovery time rather than one universal foot position.",
        },
        "backlift_preparation": {
            "goal": "Organize the grip during the first move, prepare while travelling, coil both shoulders as a unit, and set the racket head above the hands before the drop begins.",
            "cue": "Turn early; racket head above the hands.",
            "why": "Early high organization creates time and a clear starting point; racket height remains confirmation-only without racket tracking.",
        },
        "lower_body_loading": {
            "goal": "Flex the knees into a distinct loading event, organize the back or outside leg, and after the Stage 1 setup allow the racket head to drop below the hand line before acceleration.",
            "cue": "Bend and load; racket head below the hands.",
            "why": "A distinct knee load stores a usable lower-body position before the forward swing; racket position must be confirmed from a clear racket view.",
        },
        "lower_body_extension": {
            "goal": "After the load, drive the knees upward and forward through the strike window without standing up before contact.",
            "cue": "Load first; drive through second.",
            "why": "The bend and the drive are separate events. Sequencing them connects the legs to the hips and trunk instead of asking the arms to create all the speed.",
        },
        "body_position": {
            "goal": "Let the unit turn place the back shoulder beneath the chin, keep the eyes and head quiet through the likely strike window, and avoid rising before the arms complete the shot.",
            "cue": "Shoulder under chin; stay with it.",
            "why": "Stable visual and postural control supports timing and direction without asking the athlete to freeze the head unnaturally.",
        },
        "hand_swing_path": {
            "goal": "Use a compact preparation and progressive whole-chain acceleration. Let the top, non-dominant hand lead the swing path while the bottom, dominant hand stabilizes and guides the face.",
            "cue": "Top hand drives the path; bottom hand guides.",
            "why": "Clear hand roles reduce an arm-only dominant-hand hit and help the two arms extend as one connected unit. Pose speed is only a movement proxy, not a measurement of force from either hand.",
        },
        "contact_spacing": {
            "goal": "Keep connected arm space, meet the likely strike window in front, and extend through the intended line; bent and straighter elbow structures can both work when spacing is repeatable.",
            "cue": "Make room, meet it, extend it.",
            "why": "Usable forward space lets the body support the racket while respecting valid individual differences in arm structure and tactical intention.",
        },
        "ending_position": {
            "goal": "Swing through before finishing; for a topspin or depth pattern let the lead elbow rise above the nose line, then recover from the momentum already created.",
            "cue": "Through first; elbow above the nose; recover.",
            "why": "The above-nose elbow is a clear visual finish for this pattern, while flatter, defensive, high-ball, and directional finishes can legitimately vary.",
        },
    },
    "one_handed_backhand": {
        "backlift_preparation": {
            "goal": "Turn early with the racket head organized above the hand and the back shoulder presented to the incoming ball.",
            "cue": "Racket up, back shoulder to the ball.",
            "why": "Early, high organization creates time for gravity, spacing, and a clean forward extension.",
        },
        "body_position": {
            "goal": "Keep the head and chest organized through the forward strike window instead of opening away too early.",
            "cue": "Stay sideways through the window.",
            "why": "Holding the body line a fraction longer protects the hand path and contact stability.",
        },
        "contact_spacing": {
            "goal": "Create a clearly forward contact point with enough room for the hitting arm to extend.",
            "cue": "Step to space; reach through in front.",
            "why": "The one-handed backhand needs forward space to preserve leverage and directional control.",
        },
        "lower_body_loading": {
            "goal": "Keep the lead leg flexed and the body coiled long enough to store a usable forward-and-upward release.",
            "cue": "Bend the front leg; hold the coil.",
            "why": "A passive front leg removes the base the hip and shoulder release need.",
        },
        "lower_body_extension": {
            "goal": "Drive upward from the lead leg after loading without over-rotating the torso through contact.",
            "cue": "Drive up; stay sideways.",
            "why": "The leg drive supports extension while the quieter body line protects the one-hander's narrow timing margin.",
        },
        "hand_swing_path": {
            "goal": "Let the elbow lead a firm-wrist extension from behind the body into a high natural finish.",
            "cue": "Elbow leads; reach through.",
            "why": "Arm extension and body release create pace more reliably than actively lifting with the wrist.",
        },
        "ending_position": {
            "goal": "Complete a high, balanced finish without spinning the body open or collapsing the racket low.",
            "cue": "Extend, rise, finish high.",
            "why": "A complete finish preserves the reach and vertical path built before contact.",
        },
    },
    "slice": {
        "backlift_preparation": {
            "goal": "Turn sideways early with a compact continental-grip preparation above the expected contact height.",
            "cue": "Turn early; racket above the ball.",
            "why": "The early high setup creates the slice's controlled high-to-low corridor.",
        },
        "body_position": {
            "goal": "Keep the head quiet and the torso comparatively sideways through contact and the finish.",
            "cue": "Stay sideways; see the carve.",
            "why": "Rotating like a topspin stroke flattens the slice path and removes the stability of the arm split.",
        },
        "hand_swing_path": {
            "goal": "Use a firm, progressive high-to-low path that also extends down the target line.",
            "cue": "Carve forward and down.",
            "why": "A controlled forward-and-down path produces a more penetrating slice than a sudden chop.",
        },
        "ending_position": {
            "goal": "Keep the hitting arm firm while the non-dominant arm separates behind for balance.",
            "cue": "Firm through; arms split.",
            "why": "The arm split stabilizes the sideways finish and prevents the racket head from becoming loose after contact.",
        },
    },
    "backhand_slice": {},
    "serve": {
        "backlift_preparation": {
            "goal": "Coordinate the toss-arm rise, shoulder coil, and hitting-elbow organization into a repeatable trophy position.",
            "cue": "Lift together; coil under it.",
            "why": "A connected wind-up gives the later racket drop and leg drive time to synchronize.",
        },
        "lower_body_loading": {
            "goal": "Build a balanced loading position that can drive upward without excessive sway or loss of posture.",
            "cue": "Load tall, drive up.",
            "why": "A stable upward drive supports the whole-chain sequence; this release does not measure ground forces.",
        },
        "hand_swing_path": {
            "goal": "Build a smooth overhead acceleration pattern without a sudden isolated arm burst.",
            "cue": "Loose to fast, up through contact.",
            "why": "Serve speed emerges from coordinated segment timing rather than the arm acting alone.",
        },
        "lower_body_extension": {
            "goal": "Drive up and forward after the knee load while the hips, shoulders, elbow, and racket release in sequence.",
            "cue": "Load, drive, then whip.",
            "why": "Separating the load from the drive connects the legs to the overhead acceleration chain.",
        },
        "body_position": {
            "goal": "Keep the head up on the toss and likely strike window until after contact.",
            "cue": "Reach up; keep looking up.",
            "why": "Dropping the head early pulls the body and contact corridor downward.",
        },
        "contact_spacing": {
            "goal": "Reach a fully extended overhead contact corridor slightly in front of the body.",
            "cue": "Reach up and through.",
            "why": "Upward extension preserves the contact height and gives pronation room to occur naturally.",
        },
        "ending_position": {
            "goal": "Let the arm decelerate naturally down and across, then land in balance for the next ball.",
            "cue": "Release, land, recover.",
            "why": "An uninterrupted deceleration preserves rhythm and avoids an abrupt stop after contact.",
        },
    },
    "forehand_volley": {
        "backlift_preparation": {
            "goal": "Use a compact preparation with the hand in front of the torso instead of a groundstroke-sized backswing.",
            "cue": "Set early, punch short.",
            "why": "The volley has less time and benefits from compact organization and stable body support.",
        },
        "body_position": {"goal": "Keep the head quiet and the torso supported through the compact punch.", "cue": "Step in; see the ball.", "why": "A stable head and forward base help the racket absorb and redirect incoming pace."},
        "contact_spacing": {"goal": "Meet the ball in front with the hitting hand inside the chest-width corridor.", "cue": "Out front; punch short.", "why": "A compact forward contact protects timing at the net."},
        "ending_position": {"goal": "Use a deliberately short punch-and-hold finish, then re-center immediately.", "cue": "Punch, hold, reset.", "why": "Volley control comes from transfer and face stability, not swing length."},
    },
    "backhand_volley": {
        "backlift_preparation": {
            "goal": "Turn the shoulders early while keeping the hitting hand compact and in front of the body.",
            "cue": "Turn, set, block through.",
            "why": "Compact preparation preserves time and helps avoid a late, sweeping backhand volley.",
        },
        "body_position": {"goal": "Step forward without leaning back as the compact arm path meets the ball.", "cue": "Chest forward; block through.", "why": "Forward support keeps the less naturally strong side stable under pace."},
        "contact_spacing": {"goal": "Keep contact in front and preserve the non-dominant hand's support until the racket is set.", "cue": "Support, set, meet in front.", "why": "Early release of the support hand makes the racket harder to stabilize."},
        "ending_position": {"goal": "Hold a compact, firm-wrist finish and re-center the racket quickly.", "cue": "Punch, hold, reset.", "why": "A short stable finish preserves control and readiness at net."},
    },
    "overhead": {
        "footwork_base": {"goal": "Turn immediately, use running crossover steps, and move behind the projected contact point.", "cue": "Turn, cross, get behind.", "why": "Crossover movement protects visual tracking and creates room for full overhead extension."},
        "backlift_preparation": {"goal": "Move directly into a compact trophy position while the non-dominant arm stays raised toward the ball.", "cue": "Point up; set directly.", "why": "The raised arm supports tracking and coil; the direct setup protects timing under a lob."},
        "lower_body_loading": {"goal": "Set a balanced knee load beneath the ball before the overhead drive begins.", "cue": "Set under it; load.", "why": "A stable load gives the serve-like power chain a base."},
        "lower_body_extension": {"goal": "Drive or jump after loading instead of producing the smash from the arm alone.", "cue": "Legs first; reach high.", "why": "The overhead uses the same ground-up sequence as the serve."},
        "body_position": {"goal": "Keep the head and eyes locked on the ball through the highest comfortable contact point.", "cue": "Point, reach, see it.", "why": "Continuous tracking is the highest-value control against overhead mishits."},
        "hand_swing_path": {"goal": "Let the elbow lead a progressive acceleration rather than exploding from the start.", "cue": "Smooth up; fast at the top.", "why": "Late speed protects timing while still creating pace."},
        "contact_spacing": {"goal": "Reach full overhead extension without backing up until the ball falls too low.", "cue": "Get behind; take it high.", "why": "A high contact preserves downward trajectory and leverage."},
        "ending_position": {"goal": "Allow a compact down-and-across finish, land in balance, and recover to the correct court position.", "cue": "Across, land, recover.", "why": "A continuous finish avoids an abrupt stop and leaves the body ready for the next ball."},
    },
}

ACTION_OVERRIDES["backhand_slice"] = ACTION_OVERRIDES["slice"]


def _area_definition(action_type: str, area_id: str) -> dict[str, str]:
    definition = dict(AREA_DEFINITIONS[area_id])
    definition.update(ACTION_OVERRIDES.get(action_type, {}).get(area_id, {}))
    return definition

DRILLS: dict[str, dict[str, Any]] = {
    "footwork_base": {
        "id": "spacing-steps",
        "name": "Spacing-step shadow sequence",
        "purpose": "Improve arrival, base, and the first recovery step.",
        "cue": "Adjust, set, strike, recover.",
        "dosage": "3 sets of 8 controlled repetitions each side; 30 seconds rest.",
        "successMetric": "Finish balanced and initiate recovery in 7 of 8 repetitions.",
        "regression": "Perform without a ball at 50% speed.",
        "progression": "Add a random feed and recover to a marked base position.",
    },
    "body_position": {
        "id": "head-stability",
        "name": "Head-stability contact rehearsal",
        "purpose": "Improve visual and postural control through the strike window.",
        "cue": "Eyes quiet through the hit.",
        "dosage": "3 sets of 10 slow feeds.",
        "successMetric": "Head remains visibly stable through the strike window in 8 of 10 repetitions.",
        "regression": "Use self-drops or shadow swings.",
        "progression": "Alternate direction while maintaining the same head-control cue.",
    },
    "backlift_preparation": {
        "id": "turn-before-bounce",
        "name": "Turn-before-bounce drill",
        "purpose": "Create an earlier unit turn and organized preparation.",
        "cue": "Turn first, swing second.",
        "dosage": "3 sets of 10 cooperative feeds.",
        "successMetric": "Preparation is complete before the ball enters the hitting zone on 8 of 10 balls.",
        "regression": "Coach calls 'turn' before an easy hand feed.",
        "progression": "Use alternating forehand/backhand feeds with the same early-turn requirement.",
    },
    "lower_body_loading": {
        "id": "load-drive",
        "name": "Load-and-drive shadow sequence",
        "purpose": "Connect lower-body organization to the forward swing.",
        "cue": "Load, push, rotate.",
        "dosage": "3 sets of 8 controlled repetitions.",
        "successMetric": "Visible lower-body load precedes forward hand acceleration in 7 of 8 repetitions.",
        "regression": "Pause in the loading position before swinging.",
        "progression": "Remove the pause and add a controlled live feed.",
    },
    "lower_body_extension": {
        "id": "load-hold-drive",
        "name": "Load–hold–drive sequence",
        "purpose": "Separate the knee-bend load from the later upward-and-forward leg drive.",
        "cue": "Load first; drive second.",
        "dosage": "3 sets of 8 controlled repetitions.",
        "successMetric": "A visible load is followed by a later leg drive in 7 of 8 repetitions.",
        "regression": "Pause for one count at maximum load before driving.",
        "progression": "Remove the pause and preserve the sequence on controlled feeds.",
    },
    "hand_swing_path": {
        "id": "swing-corridor",
        "name": "Swing-corridor rehearsal",
        "purpose": "Improve progressive acceleration and a repeatable hand path.",
        "cue": "Smooth in, fast through.",
        "dosage": "3 sets of 10 drop feeds.",
        "successMetric": "The hand follows a similar path and tempo in 8 of 10 repetitions.",
        "regression": "Use a slow shadow swing through two visual markers.",
        "progression": "Add directional targets and moderate rally speed.",
    },
    "contact_spacing": {
        "id": "contact-window",
        "name": "Contact-window drop feeds",
        "purpose": "Improve body-to-hand spacing at the likely strike window.",
        "cue": "Create room beside the body.",
        "dosage": "3 sets of 10 feeds.",
        "successMetric": "8 of 10 repetitions show visible arm space and a balanced finish.",
        "regression": "Freeze at the contact checkpoint during shadow swings.",
        "progression": "Use moving feeds while preserving the same spacing window.",
    },
    "ending_position": {
        "id": "finish-recover",
        "name": "Hit-finish-recover pattern",
        "purpose": "Improve finish control and the first recovery action.",
        "cue": "Finish, reset, ready.",
        "dosage": "4 sets of 6 fed balls.",
        "successMetric": "Recovery begins immediately after a balanced finish on 5 of 6 balls.",
        "regression": "Hold the finish for one second, then recover.",
        "progression": "Recover to a variable target cone after each hit.",
    },
    "repeatability": {
        "id": "repeatable-six",
        "name": "Repeatable-six challenge",
        "purpose": "Reduce variation in movement duration and peak rhythm.",
        "cue": "Same shape, same tempo.",
        "dosage": "4 rounds of 6 repetitions with 45 seconds rest.",
        "successMetric": "At least 5 of 6 repetitions look and feel rhythmically similar.",
        "regression": "Use shadow swings at a fixed metronome tempo.",
        "progression": "Repeat under alternating placement demands.",
    },
}

ACTION_DRILL_OVERRIDES: dict[str, dict[str, dict[str, Any]]] = {
    "two_handed_backhand": {
        "footwork_base": {
            "name": "Split-pivot-move backhand sequence",
            "purpose": "Link recognition, first move, spacing, context-appropriate stance, and recovery.",
            "cue": "Read, pivot, move, space.",
            "successMetric": "Arrive with usable space and recover without an extra balance step in 7 of 8 repetitions.",
        },
        "backlift_preparation": {
            "name": "Grip-change and coil rehearsal",
            "purpose": "Make the grip organization, compact unit turn, first movement, and racket-head-above-hands checkpoint one action.",
            "cue": "Turn early; racket head above the hands.",
            "successMetric": "Reach a compact coiled preparation with the racket head visibly above the hands in 8 of 10 repetitions; confirm the grip separately.",
        },
        "lower_body_loading": {
            "name": "Back-leg load to transfer",
            "purpose": "Rehearse the knee-bend loading event while the racket moves from above the hands to below the hand line.",
            "cue": "Bend and load; racket head below the hands.",
            "successMetric": "A visible knee load and confirmed racket drop precede the forward swing in 7 of 8 repetitions.",
        },
        "lower_body_extension": {
            "name": "Load–hold–drive backhand",
            "purpose": "Separate the knee-bend load from the later upward-and-forward leg drive.",
            "cue": "Load first; drive through second.",
            "successMetric": "Show a visible load, stay low into the strike window, then extend into the finish in 7 of 8 repetitions.",
        },
        "body_position": {
            "name": "Chin-over-shoulder contact rehearsal",
            "purpose": "Keep the head and trunk organized while the hands travel through the strike window.",
            "cue": "Chin over the shoulder; see it through.",
            "successMetric": "The head remains visibly quiet through the strike window in 8 of 10 repetitions.",
        },
        "contact_spacing": {
            "name": "Arm-space and extension gate",
            "purpose": "Create connected arm space and extend through the intended direction before the finish.",
            "cue": "Make room, meet it, extend it.",
            "successMetric": "Show usable arm-to-torso space and forward extension in 8 of 10 repetitions.",
        },
        "hand_swing_path": {
            "name": "Top-hand path rehearsal",
            "purpose": "Let the non-dominant top hand organize and drive the low-to-high path while the dominant bottom hand stays quiet and guides.",
            "cue": "Top hand drives; bottom hand guides.",
            "successMetric": "The arms stay connected and the top hand carries the path through the ball in 8 of 10 controlled repetitions.",
        },
        "ending_position": {
            "name": "Swing-through, finish, and recover",
            "purpose": "Extend through, bring the lead elbow above the nose line for the topspin/depth finish, then recover.",
            "cue": "Through first; elbow above the nose; recover.",
            "successMetric": "Show the lead elbow above the nose line and recover without a balance leak on 5 of 6 fed balls.",
        },
    },
    "serve": {
        "ending_position": {
            "name": "Release-and-land deceleration drill",
            "purpose": "Let the racket arm decelerate down and across the body while the landing leg absorbs the jump before the next split step.",
            "cue": "Release across; land soft; reset.",
            "successMetric": "Show a controlled arm deceleration and a balanced landing on the front leg, without stopping the motion abruptly, on 5 of 6 serves.",
        },
    },
    "overhead": {
        "ending_position": {
            "name": "Land-and-recover smash drill",
            "purpose": "Let the racket arm finish down and across after contact while landing in balance and recovering to a court-ready position, mirroring the serve's deceleration pattern under a moving ball.",
            "cue": "Across, land, recover.",
            "successMetric": "Show a balanced landing and begin recovery toward the court within one step on 5 of 6 overheads.",
        },
    },
}


def _phase_timestamp(timeline: list[dict[str, Any]], phase: str) -> tuple[int | None, float | None]:
    item = next((entry for entry in timeline if entry.get("phase") == phase), None)
    if not item:
        return None, None
    return int(item["frameIndex"]), float(item["timestampSeconds"])


def _benchmark_status(control_policy: dict[str, Any]) -> dict[str, Any]:
    definition = control_policy["benchmarks"]["unreleased_reference"]
    return {
        "cohortLabel": definition["cohort_label"],
        "comparisonType": definition["comparison_type"],
        "status": definition["status"],
        "disclaimer": definition["disclaimer"],
        "areas": [],
        "nextStep": definition["next_step"],
        "policyId": control_policy["benchmarks"]["policy_id"],
        "policyVersion": control_policy["version"],
        "knowledgeControlled": True,
    }


def _score_value(metric: dict[str, Any] | None) -> int | None:
    if not metric:
        return None
    value = metric.get("score")
    return int(value) if isinstance(value, (int, float)) else None



def _measurement_coverage() -> dict[str, list[dict[str, str]]]:
    return {
        "measured": [
            {"label": "Body landmark paths", "detail": "Frame-by-frame 2D pose landmarks and visibility."},
            {"label": "Movement timing", "detail": "Decoded frame timestamps, repetition windows, and phase proxies."},
            {"label": "Joint-angle proxies", "detail": "Image-derived elbow, knee, shoulder, trunk, and base measurements."},
        ],
        "estimated": [
            {"label": "Likely contact window", "detail": "Estimated from the peak whole-chain motion frame; racket and ball are not yet detected."},
            {"label": "Centre-of-mass proxy", "detail": "Estimated from visible body landmarks, not force-plate data."},
            {"label": "Development reference", "detail": "Criterion-based coaching lens matched to the provided age band and level; not a percentile."},
        ],
        "unavailable": [
            {"label": "Racket face and ball outcome", "detail": "Requires implement and ball tracking."},
            {"label": "Ground reaction forces and joint loads", "detail": "Requires validated kinetics instrumentation."},
            {"label": "Laboratory 3D rotation", "detail": "Requires calibrated multi-camera or validated 3D reconstruction."},
        ],
    }


def _visual_moments(
    strengths: list[dict[str, Any]],
    priorities: list[dict[str, Any]],
    timeline: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    moments: list[dict[str, Any]] = []
    if strengths and strengths[0].get("timestampSeconds") is not None:
        moments.append({
            "id": "keep",
            "kind": "strength",
            "label": "Keep this",
            "title": strengths[0]["title"],
            "explanation": strengths[0]["evidence"],
            "frameIndex": strengths[0].get("frameIndex"),
            "timestampSeconds": strengths[0].get("timestampSeconds"),
        })
    if priorities and priorities[0].get("timestampSeconds") is not None:
        moments.append({
            "id": "fix-first",
            "kind": "priority",
            "label": "Fix this first",
            "title": priorities[0]["title"],
            "explanation": priorities[0]["finding"],
            "cue": priorities[0].get("cue"),
            "frameIndex": priorities[0].get("frameIndex"),
            "timestampSeconds": priorities[0].get("timestampSeconds"),
        })
    recovery = next((item for item in timeline if item.get("phase") == "recovery"), None)
    if recovery:
        moments.append({
            "id": "finish-recover",
            "kind": "checkpoint",
            "label": "Finish and reset",
            "title": "Recovery checkpoint",
            "explanation": recovery.get("coachingFocus", "Finish under control and initiate the next movement promptly."),
            "frameIndex": recovery.get("frameIndex"),
            "timestampSeconds": recovery.get("timestampSeconds"),
        })
    return moments


def _performance_story(
    action_type: str,
    strengths: list[dict[str, Any]],
    priorities: list[dict[str, Any]],
    drills: list[dict[str, Any]],
) -> dict[str, Any]:
    strongest = strengths[0]["title"] if strengths else "a measurable movement pattern"
    primary = priorities[0] if priorities else None
    secondary = priorities[1] if len(priorities) > 1 else None
    if primary:
        root = (
            f"The first constraint appears around {primary['title'].lower()}. "
            + (f"It may also be contributing to {secondary['title'].lower()}." if secondary else "Addressing it first should simplify the rest of the chain.")
        )
        milestone = drills[0]["successMetric"] if drills else primary.get("nextStep", "Repeat the target pattern consistently.")
    else:
        root = "The measured repetitions do not show one dominant technical constraint. Build repeatability before adding more corrections."
        milestone = "Record six comparable repetitions with the same rhythm and camera setup."
    return {
        "identity": f"Your {action_type.replace('_', ' ')} currently shows {strongest.lower()} as the clearest foundation.",
        "rootCauseHypothesis": root,
        "transferRisk": "Under faster or less predictable feeds, the first priority is likely to appear earlier unless preparation and spacing are stabilized.",
        "nextMilestone": milestone,
        "coachPrinciple": "Change one constraint, preserve the strongest quality, then reassess under the same conditions.",
    }


def build_practice_plan(
    action_type: str,
    priorities: list[dict[str, Any]],
    drills: list[dict[str, Any]],
) -> dict[str, Any]:
    primary = priorities[0] if priorities else None
    cue = primary.get("cue") if primary else "Same shape, same tempo."
    drill_one = drills[0] if drills else None
    drill_two = drills[1] if len(drills) > 1 else drill_one
    return {
        "title": "7-day improvement loop",
        "primaryGoal": primary.get("title") if primary else "Movement repeatability",
        "cue": cue,
        "sessions": [
            {
                "id": "learn",
                "day": "Session 1",
                "title": "Learn the shape",
                "duration": "20 minutes",
                "cue": cue,
                "objective": primary.get("nextStep") if primary else "Build a stable repeatable movement.",
                "drillName": drill_one.get("name") if drill_one else "Controlled shadow repetitions",
                "dosage": drill_one.get("dosage") if drill_one else "3 sets of 8 repetitions.",
                "successMetric": drill_one.get("successMetric") if drill_one else "7 of 8 repetitions finish balanced.",
            },
            {
                "id": "stabilize",
                "day": "Session 2",
                "title": "Stabilize under a feed",
                "duration": "25 minutes",
                "cue": cue,
                "objective": f"Use only the cue: {cue}",
                "drillName": drill_two.get("name") if drill_two else "Controlled feed progression",
                "dosage": drill_two.get("dosage") if drill_two else "4 sets of 6 repetitions.",
                "successMetric": drill_two.get("successMetric") if drill_two else "5 of 6 repetitions meet the target shape.",
            },
            {
                "id": "transfer",
                "day": "Session 3",
                "title": "Transfer to live movement",
                "duration": "25 minutes",
                "cue": cue,
                "objective": "Preserve the main cue at moderate pace without consciously controlling every body part.",
                "drillName": "Constraint-to-rally transfer",
                "dosage": "3 rounds of 8 controlled balls, then 3 minutes of cooperative rallying.",
                "successMetric": "The target pattern remains visible in at least 70% of live repetitions.",
            },
            {
                "id": "reassess",
                "day": "Day 7",
                "title": "Record and reassess",
                "duration": "10 minutes",
                "cue": cue,
                "objective": f"Record 8–12 comparable {action_type.replace('_', ' ')} repetitions.",
                "drillName": "Same-drill reassessment",
                "dosage": "Use the same camera position, drill, intensity, and intended shot.",
                "successMetric": drill_one.get("successMetric") if drill_one else "Show a more repeatable target pattern.",
            },
        ],
    }

def build_coaching(
    sport_id: str,
    action_type: str,
    metric_scores: list[dict[str, Any]],
    phase_scores: list[dict[str, Any]],
    timeline: list[dict[str, Any]],
    confidence: float,
    score_status: str,
    age_band: str | None = None,
    playing_level: str | None = None,
    *,
    control_policy: dict[str, Any],
) -> tuple[list[dict], list[dict], list[dict], dict, list[str], list[dict], dict, dict, dict, list[dict], dict, dict, list[dict]]:
    del age_band, playing_level
    if control_policy.get("fail_closed") is not True:
        raise ValueError("Coaching interpretation requires a fail-closed knowledge-control policy.")
    scoring_policy = control_policy["scoring"]
    area_status_policy = scoring_policy["coaching_area_status"]
    candidate_policy = control_policy["recommendations"]["candidate_ranking"]
    reference = _benchmark_status(control_policy)
    evidence = evidence_for(sport_id, action_type)

    if score_status == "pending_movement_confirmation":
        coach_summary = {
            "headline": "Confirm the stroke before coaching is finalized",
            "strongestQuality": "Video quality has been checked and movement windows were detected.",
            "mainPriority": "Choose the correct stroke label so the engine can apply the right phase model and coaching rules.",
            "whyItMatters": "A forehand, backhand, serve, and volley use different technical checkpoints. Applying the wrong model would create misleading feedback.",
            "practiceFocus": [
                "Confirm the detected stroke or keep the original selection.",
                "Re-run the report using the confirmed movement.",
                "Then review the synchronized key frames and practice plan.",
            ],
        }
        limitations = [
            "Sport-specific scoring and coaching are paused until the movement label is confirmed.",
            "The classifier is a deterministic pose-based beta and does not yet track the racket or ball.",
            "Monocular video cannot directly measure forces, joint moments, muscle activity, racket-face angle, ball speed, or true 3D rotation.",
        ]
        next_session = {
            "objective": "Confirm the movement",
            "recordingPlan": "No new recording is required unless the capture-quality panel recommends one.",
            "successCriteria": ["The report shows a confirmed analysis movement."],
            "sessionPlan": [],
        }
        performance_story = {
            "identity": "The video was decoded, but the stroke identity must be confirmed before technical coaching is applied.",
            "rootCauseHypothesis": "No technical root-cause hypothesis is generated until the correct movement model is selected.",
            "transferRisk": "Applying the wrong stroke model would create misleading advice.",
            "nextMilestone": "Confirm the movement label and rerun the same clip.",
            "coachPrinciple": "Correct classification comes before scoring.",
        }
        return [], [], [], next_session, limitations, [], reference, coach_summary, performance_story, [], _measurement_coverage(), {"title": "Practice plan locked", "primaryGoal": "Confirm movement", "cue": "Confirm before coaching.", "sessions": []}, evidence

    scored = {item["id"]: item for item in metric_scores}
    emphasis = ACTION_EMPHASIS.get(action_type, list(AREA_DEFINITIONS))
    coaching_areas: list[dict[str, Any]] = []

    for area_id in emphasis:
        definition = _area_definition(action_type, area_id)
        metric = scored.get(area_id)
        score = _score_value(metric)
        if score is None:
            continue
        if (
            metric.get("knowledgeControlled") is not True
            or metric.get("policyId") != scoring_policy["policy_id"]
            or metric.get("policyVersion") != control_policy["version"]
        ):
            raise ValueError(f"Coaching area {area_id} bypassed the knowledge-owned score contract.")
        frame_index, timestamp = _phase_timestamp(timeline, definition["phase"])
        status = (
            "strength" if score >= int(area_status_policy["strength_minimum"])
            else "developing" if score >= int(area_status_policy["developing_minimum"])
            else "priority"
        )
        coaching_areas.append({
            "id": area_id,
            "label": definition["label"],
            "score": score,
            "status": status,
            "observation": metric.get("explanation", "No observation available."),
            "coachingGoal": definition["goal"],
            "cue": definition["cue"],
            "whyItMatters": definition["why"],
            "frameIndex": frame_index,
            "timestampSeconds": timestamp,
            "confidence": float(metric.get("confidence", confidence)),
            "measurementBasis": metric.get("basis", "development_rule"),
            "evidenceRecords": metric.get("evidenceRecords", []),
            "policyId": scoring_policy["policy_id"],
            "policyVersion": control_policy["version"],
            "knowledgeControlled": True,
        })

    strongest = sorted(coaching_areas, key=lambda item: (-item["score"], item["id"]))[:2]
    strengths = [
        {
            "title": item["label"],
            "evidence": item["observation"],
            "frameIndex": item["frameIndex"],
            "timestampSeconds": item["timestampSeconds"],
            "confidence": item["confidence"],
        }
        for item in strongest
    ]

    # Prioritization balances score, impact, and measurement confidence. It does not
    # pretend that the lowest numerical value is always the correct first fix.
    impact_weight = candidate_policy["impact_weights"]
    minimum_confidence_factor = float(candidate_policy["minimum_confidence_factor"])
    ranked = sorted(
        coaching_areas,
        key=lambda item: (
            -((100 - item["score"]) * float(impact_weight[item["id"]]) * max(minimum_confidence_factor, item["confidence"])),
            item["id"],
        ),
    )
    weakest = ranked[:int(candidate_policy["maximum_candidates"])]
    priorities: list[dict[str, Any]] = []
    drills: list[dict[str, Any]] = []
    for index, item in enumerate(weakest):
        priorities.append({
            "rank": index + 1,
            "title": item["label"],
            "finding": item["observation"],
            "impact": item["whyItMatters"],
            "nextStep": item["coachingGoal"],
            "cue": item["cue"],
            "frameIndex": item["frameIndex"],
            "timestampSeconds": item["timestampSeconds"],
            "confidence": item["confidence"],
            "measurementBasis": item["measurementBasis"],
        })
        drill = dict(DRILLS[item["id"]])
        drill.update(ACTION_DRILL_OVERRIDES.get(action_type, {}).get(item["id"], {}))
        drills.append(drill)

    primary = priorities[0] if priorities else None
    coach_summary = {
        "headline": f"Your {action_type.replace('_', ' ')}: keep the best quality, fix one priority first",
        "strongestQuality": strengths[0]["title"] if strengths else "A usable movement pattern was detected.",
        "mainPriority": primary["title"] if primary else "Build more repeatable repetitions.",
        "whyItMatters": primary["impact"] if primary else "Repeatable movement makes improvement easier to measure and transfer.",
        "practiceFocus": [
            primary["cue"] if primary else "Same shape, same tempo.",
            drills[0]["name"] if drills else "Controlled technical repetitions.",
            drills[0]["successMetric"] if drills else "Record at least six comparable repetitions.",
        ],
    }

    next_session = {
        "objective": primary["title"] if primary else "Improve repeatability",
        "recordingPlan": (
            f"Record 8–12 {action_type.replace('_', ' ')} repetitions from the same stable rear-side angle. "
            "Keep the full body, racket, and likely contact area visible. Use the same drill so the next report is comparable."
        ),
        "successCriteria": [drill["successMetric"] for drill in drills],
        "sessionPlan": [
            {
                "block": "Technical rehearsal",
                "duration": "8 minutes",
                "focus": primary["cue"] if primary else "Smooth, balanced repetitions",
            },
            {
                "block": "Controlled feeds",
                "duration": "12 minutes",
                "focus": drills[0]["name"] if drills else "Repeatable strike window",
            },
            {
                "block": "Transfer to rally",
                "duration": "10 minutes",
                "focus": "Use only the main cue at moderate pace; do not chase all corrections at once.",
            },
        ],
    }

    limitations = [
        "This release uses monocular pose estimates and criterion-based control proxies; it is not equivalent to laboratory 3D motion capture, force plates, instrumented rackets, or ball tracking.",
        "The likely contact moment is the peak whole-chain motion frame because the ball and racket are not yet detected.",
        "Image-plane shoulder-pelvis orientation is a camera-dependent proxy, not a direct measurement of axial trunk rotation.",
        "The execution index is a transparent development heuristic, not a medical assessment or a peer percentile.",
        "Scores should only be compared when the video, engine versions, camera setup, movement label, and athlete context are unchanged.",
    ]
    if confidence < float(control_policy["reliability"]["low_measurement_confidence_notice"]):
        limitations.insert(0, "Measurement confidence is limited; improve lighting, framing, and full-body visibility before making major technical decisions.")

    performance_story = _performance_story(action_type, strengths, priorities, drills)
    visual_moments = _visual_moments(strengths, priorities, timeline)
    measurement_coverage = _measurement_coverage()
    practice_plan = build_practice_plan(action_type, priorities, drills)

    return (
        strengths,
        priorities,
        drills,
        next_session,
        limitations,
        coaching_areas,
        reference,
        coach_summary,
        performance_story,
        visual_moments,
        measurement_coverage,
        practice_plan,
        evidence,
    )
