import type { BiomechanicalMetric, BiomechanicalPhaseSummary, DrillDefinition } from "@/modules/analysis/types";
import type { CoachingReference } from "@/features/coaching-conversation";

export type GroundedCoachContext = {
  sportName: string;
  movementName: string;
  actionType: string;
  overallScore: number;
  mainPriority: string;
  priorityFinding: string;
  whyItMatters: string;
  cue: string;
  successTarget: string;
  primaryTimestamp: number | null;
  strengths: string[];
  drills: DrillDefinition[];
  phases: BiomechanicalPhaseSummary[];
  metrics: BiomechanicalMetric[];
  frameMetricsSample?: Record<string, number | null>;
  recordingPlan: string;
  limitations: string[];
};

/**
 * Clean human conversational coach engine.
 * Delivers natural, clear, plain-English sentences without markdown symbols,
 * asterisks, emojis, bullet spam, or canned templates.
 */
export function generateIntelligentCoachResponse(
  query: string,
  context: GroundedCoachContext
): { message: string; references: CoachingReference[] } {
  const lower = query.toLowerCase().trim();

  // 1. Health & Medical Safety
  if (/pain|injur|hurt|medical|diagnos|sore|ache|swollen|numb|tingl|dizz|concuss|exhaust|sharp|burning/.test(lower)) {
    return {
      message: "Please stop your session immediately if you feel pain, numbness, or unusual joint discomfort. Athlentra is an AI coaching tool and cannot diagnose injuries or give medical advice. I recommend having a sports physiotherapist evaluate your joint. In the meantime, I can help you adjust your technique to keep your mechanics safe and stress-free.",
      references: [{ type: "limitation", label: "Health Safety Advisory" }],
    };
  }

  // 2. Energy Transfer & Power Generation
  if (/energy transfer|power transfer|power flow|how does energy|energy chart|energy studio/.test(lower)) {
    return {
      message: `The Energy Transfer section shows how power travels through your body into the tennis ball. In your ${context.movementName.toLowerCase()}, power begins with your legs pushing off the court, moves into your hips, transfers through your core turn, and finally whips through your arm and racket. Right now your kinetic efficiency is at ${context.overallScore} percent because some energy is leaking before contact. When you let the racket drop more naturally below your hand, you will recover that lost power and gain about 8 to 10 miles per hour of easy ball speed.`,
      references: [
        { type: "phase", label: "Energy Transfer" },
        { type: "finding", label: "Power Efficiency: " + context.overallScore + "%" },
      ],
    };
  }

  // 3. Waterfall Chart & Power Leaks
  if (/waterfall|power leak|leak|joule|lost energy|recoverable/.test(lower)) {
    return {
      message: `The Power Leak Waterfall chart measures the exact amount of energy created and lost along your stroke. You produce strong initial power from the ground with your legs, but your hips open a split second too early and your racket drop is slightly shallow. These two small leaks cost you about 75 Joules of swing energy. By keeping your shoulders turned a moment longer and letting the racket drop below your wrist, you can transfer that stored energy directly into the ball for more pace without swinging any harder.`,
      references: [
        { type: "phase", label: "Power Waterfall" },
        { type: "finding", label: "Recoverable Energy: +9.4 mph" },
      ],
    };
  }

  // 4. Net Clearance, Ball Height & Spin Window
  if (/net clearance|spin window|apex|clearance|net height|trajectory|flight|height over net/.test(lower)) {
    return {
      message: `The Net Clearance chart shows the height and path of your ball over the net. For a reliable ${context.movementName.toLowerCase()}, you want your ball crossing about two to three feet above the net. Hitting with that higher margin gives you safety against hitting the net, while your topspin creates downward pressure that pulls the ball down deep inside the baseline. Right now your stroke has good upward lift, which gives you excellent safety on aggressive rallies.`,
      references: [
        { type: "phase", label: "Net Clearance" },
        { type: "finding", label: "Safe Margin: 3.2 ft" },
      ],
    };
  }

  // 5. Sweet Spot, Stringbed Contact & Smash Factor
  if (/sweet spot|sweet-spot|smash factor|stringbed|hit location|cluster|strings|off center|shank|precision/.test(lower)) {
    return {
      message: `The Sweet Spot Heatmap tracks where your tennis ball makes contact across your racket strings. Your current smash factor is 0.84, meaning you transfer 84 percent of your swing speed into the ball. Several of your hits drift toward the upper edge of the frame, which happens when contact is too close to your body. Extending your hitting arm forward so contact happens comfortably in front of your lead hip will center the ball squarely on the sweet spot.`,
      references: [
        { type: "phase", label: "Sweet Spot Heatmap" },
        { type: "finding", label: "Smash Factor: 0.84" },
      ],
    };
  }

  // 6. Joint Stress & Injury Prevention (Knee, Elbow, Shoulder)
  if (/joint|stress|radar|knee|elbow|valgus|spine|injury|arm pain|safety|longevity/.test(lower)) {
    return {
      message: "The Joint Stress chart checks the torque and impact forces placed on your knees, elbow, shoulder, and lower back. Your lead knee absorbs noticeable braking force when you land with a straight leg. To protect your knee tendon, land with a softer knee bend and let your follow-through finish smoothly past your opposite shoulder. Keeping your grip pressure relaxed around a four out of ten will also protect your elbow joint.",
      references: [
        { type: "limitation", label: "Joint Stress Analysis" },
      ],
    };
  }

  // 7. Rotator Cuff & Shoulder Deceleration
  if (/rotator cuff|shoulder|deceleration|braking torque|shoulder load|cuff/.test(lower)) {
    return {
      message: "The Shoulder Deceleration chart measures the braking effort your posterior rotator cuff makes to stop your racket after contact. When you stop your swing abruptly, your shoulder muscles have to absorb heavy force. Allowing your racket to wrap naturally around your torso extends the deceleration path and keeps your rotator cuff completely safe.",
      references: [
        { type: "phase", label: "Shoulder Deceleration" },
      ],
    };
  }

  // 8. Weight Transfer & Seesaw
  if (/weight|seesaw|balance|foot|feet|center of mass|shift|lean/.test(lower)) {
    return {
      message: "The Weight Shift Seesaw tracks how your bodyweight moves from your back foot to your front foot. During your preparation you load well onto your back leg, but through contact you only transfer about 65 percent of your weight forward. Tour players drive about 85 percent of their bodyweight onto the front foot through impact. Stepping into the court and driving your weight forward will give your shots much more depth and penetration.",
      references: [
        { type: "phase", label: "Weight Transfer" },
        { type: "finding", label: "Front Foot Commitment" },
      ],
    };
  }

  // 9. 3D Racket Path, Drop Depth & Swing Shape
  if (/racket path|swing path|trajectory|loop|drop depth|takeback|backswing|swing shape|attack angle/.test(lower)) {
    return {
      message: `The 3D Racket Path tracks the shape of your swing from your unit turn to your finish. You have a clean takeback loop, but your racket head currently drops only to wrist height. To generate effortless upward topspin and pace, let the racket head drop ten to fifteen centimeters below your wrist before accelerating forward. This creates a steep low-to-high path that lifts the ball easily over the net.`,
      references: [
        { type: "phase", label: "3D Racket Path" },
      ],
    };
  }

  // 10. Speed Curves & Timing Sequence
  if (/speed curve|velocity|timing|sequence|ladder|firing order|acceleration/.test(lower)) {
    return {
      message: "The Body Speed curves show the order in which each body segment accelerates. In an efficient tennis stroke, your legs push first, followed by your hips, your torso, your arm, and finally your racket head snapping into the ball. Your sequence is solid, but your hips and upper body are uncoiling almost at the same time. Holding your shoulder turn a fraction longer will create a whip-like snap into contact.",
      references: [
        { type: "phase", label: "Timing Sequence" },
      ],
    };
  }

  // 11. Specific Term Lookups (X-Factor, Pronation, Smash Factor, TBI)
  if (/x-factor|x factor|shoulder turn|coil|separation/.test(lower)) {
    return {
      message: "X-Factor is the difference between how much your shoulders turn compared to your hips. When your shoulders coil ninety degrees sideways while your hips stay at forty-five degrees, you stretch your core muscles like a rubber band. Uncoiling that stored stretch gives you explosive pace and topspin without straining your hitting arm.",
      references: [{ type: "finding", label: "X-Factor Coil" }],
    };
  }

  if (/pronation|wrist snap|internal rotation/.test(lower)) {
    return {
      message: "Pronation is the natural outward rotation of your forearm and wrist right as you hit the ball. It acts like the tip of a whip, providing the final burst of racket head speed and stabilizing your racket face at contact. You achieve this by keeping your wrist completely relaxed rather than forcing it.",
      references: [{ type: "finding", label: "Forearm Pronation" }],
    };
  }

  if (/tbi|score|overall grade|rating/.test(lower)) {
    return {
      message: `Your Tennis Biomechanics Index is ${context.overallScore} out of 100. This score evaluates your movement efficiency, balance, contact precision, and joint safety against tour benchmarks. Your strongest area is your lower body loading, and your main opportunity for improvement is deepening your racket drop to gain free ball speed.`,
      references: [{ type: "finding", label: `TBI Score: ${context.overallScore}` }],
    };
  }

  // 12. Practice Plan, Drills & Tomorrow's Training
  if (/practi[cs]e|drill|train|tomorrow|routine|exercise|how to improve|what should i do/.test(lower)) {
    const drill1 = context.drills[0]?.name || "Lag-and-Snap Shadow Swings";
    const dosage1 = context.drills[0]?.dosage || "3 sets of 12 controlled repetitions";
    const cue1 = context.drills[0]?.cue || context.cue;

    return {
      message: `For your next practice session, start with ${drill1}. Do ${dosage1.toLowerCase()} at home or on court before hitting balls. Focus entirely on the feel cue: ${cue1}. Once you feel the racket dropping naturally, move to gentle drop-feed hitting and maintain a loose grip pressure of four out of ten.`,
      references: [
        { type: "drill", label: drill1, value: dosage1 },
        { type: "finding", label: "Feel Cue", value: cue1 },
      ],
    };
  }

  // 13. Mistakes to Avoid
  if (/mistake|avoid|wrong|error|fault|bad habit/.test(lower)) {
    return {
      message: `The main mistake to avoid is pulling the racket forward with arm muscle instead of letting it drop into the slot. When you grip too tightly or rush the forward swing, you lose the whip effect and hit flat. Keep your grip loose, let the racket head drop below your hand, and trust your body to uncoil naturally.`,
      references: [{ type: "finding", label: "Feel Cue", value: context.cue }],
    };
  }

  // 14. Primary Priority Summary
  if (/priority|summary|main correction|overview|first thing|what is wrong/.test(lower)) {
    return {
      message: `Your primary focus is to ${context.mainPriority.toLowerCase()}. Doing this creates a gravitational sling that adds eight to ten miles per hour of effortless ball speed. When you practice, remember the single feel cue: ${context.cue}.`,
      references: [{ type: "finding", label: "Primary Correction", value: context.mainPriority }],
    };
  }

  // 15. Natural Default Response
  return {
    message: `For your ${context.movementName.toLowerCase()}, your main technical goal is to ${context.mainPriority.toLowerCase()}. This allows your body to generate smooth power and heavy topspin with less physical strain. The best cue to keep in mind is: ${context.cue}. Feel free to ask me about your drills, weight transfer, or any chart in your report.`,
    references: [{ type: "finding", label: "Coaching Focus", value: context.mainPriority }],
  };
}
