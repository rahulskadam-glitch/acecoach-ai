export type ReviewTheme = {
  id: string;
  label: string;
  playerNeed: string;
  recurringFeedback: string;
  aceCoachResponse: string[];
  coverageScore: number;
  outcomeStatus: "strong" | "developing" | "gap";
  evidenceNote: string;
};

export const reviewThemes: ReviewTheme[] = [
  {
    id: "reliability",
    label: "Reliability and trust",
    playerNeed: "The app should not lose work, change the answer unexpectedly, or fail without explanation.",
    recurringFeedback: "Users repeatedly complain about crashes, lost libraries, inconsistent AI, stalled uploads, and unclear processing states.",
    aceCoachResponse: [
      "Content-hash and engine-version fingerprints",
      "Same-context analysis deduplication",
      "Reliability gates and withheld scores",
      "Upload cleanup and explicit failure states",
    ],
    coverageScore: 4.2,
    outcomeStatus: "strong",
    evidenceNote: "Coverage is strong, but production monitoring and large-scale load testing are still required.",
  },
  {
    id: "capture",
    label: "Easy capture and setup",
    playerNeed: "Recording should work on court without trial-and-error.",
    recurringFeedback: "Players value simple setup and dislike device restrictions, poor framing, long clips, and discovering capture problems after processing.",
    aceCoachResponse: [
      "Sport-specific filming instructions",
      "Browser preflight for duration, resolution, and orientation",
      "Server-side visibility, clipping, and pose-quality gates",
      "Short-clip protocol and capture reset guidance",
    ],
    coverageScore: 3.7,
    outcomeStatus: "developing",
    evidenceNote: "A live silhouette/framing assistant and native high-frame-rate recording remain open gaps.",
  },
  {
    id: "clarity",
    label: "Clear, understandable insights",
    playerNeed: "Tell me what matters, show me where it happens, and avoid drowning me in metrics.",
    recurringFeedback: "Users praise apps that translate data into one correction and criticize clunky interfaces or unexplained measurements.",
    aceCoachResponse: [
      "One primary correction",
      "Coach verdict and performance story",
      "Visual movement map and key-frame filmstrip",
      "Technical depth collapsed behind player-first coaching",
    ],
    coverageScore: 4.6,
    outcomeStatus: "strong",
    evidenceNote: "This is one of Athlentra's strongest product dimensions.",
  },
  {
    id: "actionability",
    label: "Actionable drills and next steps",
    playerNeed: "I need to know exactly what to practise and how to know it worked.",
    recurringFeedback: "Positive reviews consistently mention tailored drills, instant feedback, simple cues, and visible improvement.",
    aceCoachResponse: [
      "Cue, drill, dosage, success metric, and transfer challenge",
      "Seven-day practice plan",
      "Practice check-ins and confidence tracking",
      "Comparable reassessment workflow",
    ],
    coverageScore: 4.5,
    outcomeStatus: "strong",
    evidenceNote: "Real-time drill feedback is the next major step.",
  },
  {
    id: "visuals",
    label: "Visual learning and comparison",
    playerNeed: "Let me see the correction instead of reading a technical paragraph.",
    recurringFeedback: "Users value frame stepping, side-by-side comparison, reference video, overlays, and repeated playback.",
    aceCoachResponse: [
      "Synchronized annotated playback",
      "Phase navigation and frame stepping",
      "Hand path and center-of-mass proxies",
      "Three-way player/category/elite comparison studio",
      "Visual biomechanics body map",
      "Category checkpoint dashboard and elite pattern lens",
    ],
    coverageScore: 4.8,
    outcomeStatus: "strong",
    evidenceNote: "The visual report is now near best-in-class; calibrated ghost overlays, synchronized reference phases, and body-dimension matching remain future work.",
  },
  {
    id: "speed",
    label: "Processing speed and transparency",
    playerNeed: "Analysis should feel fast, continue reliably, and show honest status.",
    recurringFeedback: "Slow AI, long exports, foreground-only uploads, and unclear waiting states are common negative themes.",
    aceCoachResponse: [
      "Short-clip preflight",
      "Honest elapsed-time processing stages",
      "Timeouts and safe response-size limits",
      "No invented completion percentages",
    ],
    coverageScore: 3.5,
    outcomeStatus: "developing",
    evidenceNote: "A durable background queue, push notifications, and offline sync are not yet implemented.",
  },
  {
    id: "progress",
    label: "Progress that proves improvement",
    playerNeed: "Show whether the targeted change is improving over comparable sessions.",
    recurringFeedback: "Users stay engaged when the product tracks progress, personal bests, consistency, goals, and reassessment.",
    aceCoachResponse: [
      "Comparable-session safety checks",
      "Current-focus dashboard",
      "Best-repetition self-reference",
      "Longitudinal movement-chain and consistency analytics",
    ],
    coverageScore: 4.0,
    outcomeStatus: "strong",
    evidenceNote: "Outcome validation against match performance remains a longer-term requirement.",
  },
  {
    id: "collaboration",
    label: "Coach collaboration",
    playerNeed: "I want to share the report and keep a human coach in the loop.",
    recurringFeedback: "Coach messaging, organization, voice-over, assignments, and fast follow-up are major retention drivers.",
    aceCoachResponse: [
      "Expiring coach-summary links",
      "Private report sharing without raw pose data",
      "Practice-plan export",
      "Player report feedback loop",
    ],
    coverageScore: 3.0,
    outcomeStatus: "developing",
    evidenceNote: "A full coach roster, annotations, messaging, and assignments remain open gaps.",
  },
  {
    id: "mobile",
    label: "Mobile and device convenience",
    playerNeed: "The experience should be quick to open, installable, and usable courtside.",
    recurringFeedback: "Device lock-in, small-screen constraints, battery use, and unsupported hardware generate frequent complaints.",
    aceCoachResponse: [
      "Responsive web interface",
      "Installable PWA manifest",
      "Mobile-friendly upload and report navigation",
      "No iOS-only product restriction",
    ],
    coverageScore: 3.2,
    outcomeStatus: "developing",
    evidenceNote: "Native high-FPS capture, offline work, background upload, and push notifications remain open gaps.",
  },
  {
    id: "value",
    label: "Value, pricing, and support",
    playerNeed: "Pricing should match reliable improvement, with transparent limits and responsive support.",
    recurringFeedback: "Users reject expensive products when core reliability is weak and praise responsive teams that visibly act on feedback.",
    aceCoachResponse: [
      "Research-beta status and limitations displayed",
      "Transparent proposed pricing",
      "In-report and product-level feedback collection",
      "Review-incorporation scorecard and release traceability",
    ],
    coverageScore: 4.1,
    outcomeStatus: "strong",
    evidenceNote: "Commercial support operations and service-level commitments do not yet exist.",
  },
];

export const reviewCoverageScore = Number(
  (reviewThemes.reduce((total, theme) => total + theme.coverageScore, 0) / reviewThemes.length).toFixed(1),
);

export const competitiveScorecard = [
  { capability: "Multi-sport extensibility", score: 4.3, benchmark: 5, note: "Strong shared registry; validated intelligence remains tennis-first." },
  { capability: "Evidence transparency and safety", score: 4.5, benchmark: 5, note: "Clear measured/proxy boundaries, confidence gates, and source traceability." },
  { capability: "Upload and capture experience", score: 3.7, benchmark: 5, note: "Preflight and filming guidance are strong; live framing and native capture are missing." },
  { capability: "Movement recognition", score: 3.0, benchmark: 5, note: "Repetition-consensus heuristic improved; trained RGB+racket+ball classifier remains required." },
  { capability: "Racket/bat/ball tracking", score: 1.2, benchmark: 5, note: "Not yet implemented; no score inflation applied." },
  { capability: "Biomechanical validity", score: 2.8, benchmark: 5, note: "Robust signal analytics and reliability gates improved; monocular validation remains incomplete." },
  { capability: "Frame-synchronized feedback", score: 4.8, benchmark: 5, note: "Annotated playback, body map, key moments, phase navigation, and three-level visual comparison." },
  { capability: "Clarity of improvement priorities", score: 4.7, benchmark: 5, note: "One correction, visual proof, body-chain location, cue, drill, and pass condition." },
  { capability: "Guided practice and reassessment", score: 4.1, benchmark: 5, note: "Persistent plan, check-ins, success targets, and comparable reassessment." },
  { capability: "Longitudinal progress intelligence", score: 4.0, benchmark: 5, note: "New progress analytics consolidate score, consistency, practice, and movement-chain trends." },
  { capability: "Coach collaboration", score: 3.0, benchmark: 5, note: "Secure sharing exists; a complete coach workspace is not yet built." },
  { capability: "Mobile convenience", score: 3.2, benchmark: 5, note: "Installable responsive PWA; native capture and offline sync remain gaps." },
  { capability: "Production maturity and validation", score: 3.2, benchmark: 5, note: "Determinism, security and tests improved; no independent biomechanics validation or production queue." },
  { capability: "User-review incorporation", score: reviewCoverageScore, benchmark: 5, note: "Measures feature coverage of recurring review themes—not market satisfaction." },
];
