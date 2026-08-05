export type ReferenceCheckpoint = {
  id: string;
  label: string;
  focus: string;
  eliteFocus?: string;
};

export type ReferenceMedia = {
  id: string;
  tier: "category" | "elite";
  title: string;
  organization: string;
  sourceUrl: string;
  youtubeId?: string;
  audience?: string[];
  actionTypes?: string[];
  description: string;
  rightsNote: string;
};

export type ReferenceExperience = {
  id: string;
  sportId: string;
  actionTypes: string[];
  libraryUrl?: string;
  categoryLabel: string;
  whyThisReference: string;
  checkpoints: ReferenceCheckpoint[];
  categoryReferences: ReferenceMedia[];
  eliteReferences: ReferenceMedia[];
  disclaimer: string;
};

export type AthleteReferenceContext = {
  ageBand?: string | null;
  playingLevel?: string | null;
  dominantSide?: string | null;
  gender?: string | null;
  heightCm?: number | null;
};

export type SelectedReferenceExperience = ReferenceExperience & {
  categoryReference: ReferenceMedia | null;
  eliteReference: ReferenceMedia | null;
  categoryLens: string;
};

function normalizeAction(actionType: string) {
  return actionType.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
}

function normalizeLevel(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function levelBucket(value?: string | null) {
  const level = normalizeLevel(value);
  if (["beginner", "starter", "recreational", "novice"].some((item) => level.includes(item))) return "foundation";
  if (["advanced", "elite", "professional", "college", "national", "international"].some((item) => level.includes(item))) return "performance";
  return "development";
}

function chooseCategoryReference(items: ReferenceMedia[], context?: AthleteReferenceContext) {
  if (items.length === 0) return null;
  const bucket = levelBucket(context?.playingLevel);
  return items.find((item) => item.audience?.includes(bucket))
    ?? items.find((item) => !item.audience || item.audience.length === 0)
    ?? items[0];
}

function chooseEliteReference(items: ReferenceMedia[], actionType: string) {
  if (items.length === 0) return null;
  const normalized = normalizeAction(actionType);
  return items.find((item) => item.actionTypes?.includes(normalized))
    ?? items.find((item) => !item.actionTypes || item.actionTypes.length === 0)
    ?? items[0];
}

function categoryLens(context?: AthleteReferenceContext) {
  const age = context?.ageBand?.trim() || "Open age";
  const level = context?.playingLevel?.trim() || "Development level";
  const side = context?.dominantSide?.trim();
  return [age, level, side ? `${side}-side` : null].filter(Boolean).join(" · ");
}

const references: ReferenceExperience[] = [
  {
    id: "tennis-forehand-dual-benchmark",
    sportId: "tennis",
    actionTypes: ["forehand"],
    libraryUrl: "https://www.playerdevelopment.usta.com/high_performance_technique/",
    categoryLabel: "Forehand development lens",
    whyThisReference: "The category reference teaches a repeatable development shape; the elite library shows how world-class players express the same principles with different grips, stances, tempos, and tactical intentions.",
    checkpoints: [
      { id: "preparation", label: "Preparation", focus: "Turn early enough to create time and spacing before the forward swing.", eliteFocus: "Elite players vary the size of the takeback, but they organize the body early enough to preserve options." },
      { id: "loading", label: "Base and loading", focus: "Use an athletic base and organize the body behind the intended contact.", eliteFocus: "High performers coordinate the legs, pelvis, trunk, and arm rather than creating speed with the arm alone." },
      { id: "contact", label: "Contact window", focus: "Create comfortable spacing and send the racket through the intended target window.", eliteFocus: "The exact contact height varies, while stable spacing and a purposeful racket path remain visible." },
      { id: "recovery", label: "Finish and recovery", focus: "Finish under control and become ready for the next ball.", eliteFocus: "Elite finishes vary with spin and situation, but balance and readiness for the next action are preserved." },
    ],
    categoryReferences: [
      {
        id: "usta-forehand-foundation",
        tier: "category",
        title: "How to Get Started in Tennis",
        organization: "United States Tennis Association",
        sourceUrl: "https://www.youtube.com/watch?v=CLxxkiZLfVQ",
        youtubeId: "CLxxkiZLfVQ",
        audience: ["foundation"],
        description: "A simple governing-body introduction for athletes building a stable ready position, contact window, and repeatable swing.",
        rightsNote: "Public YouTube embed from the source channel; AceCoach does not download or redistribute the video.",
      },
      {
        id: "usta-forehand-development",
        tier: "category",
        title: "How to Perfect Your Forehand",
        organization: "United States Tennis Association",
        sourceUrl: "https://www.youtube.com/watch?v=WXSI9PZrmI0",
        youtubeId: "WXSI9PZrmI0",
        audience: ["development", "performance"],
        description: "A governing-body coaching demonstration emphasizing preparation, spacing, body support, contact, and a controlled finish.",
        rightsNote: "Public YouTube embed from the source channel; AceCoach does not download or redistribute the video.",
      },
    ],
    eliteReferences: [
      {
        id: "elite-forehand-variation-library",
        tier: "elite",
        title: "ATP Forehands in Slow Motion",
        organization: "Top Tennis Training",
        sourceUrl: "https://www.youtube.com/watch?v=lgCokC--lyI",
        youtubeId: "lgCokC--lyI",
        description: "A multi-player slow-motion library selected to show that elite forehands share organizing principles while retaining meaningful individual variation.",
        rightsNote: "Public YouTube embed from the source channel; availability and rights remain with the publisher.",
      },
    ],
    disclaimer: "The category lens is criterion-based, not a statistical cohort percentile. The elite video is a visual exemplar library, not a compulsory body-angle template.",
  },
  {
    id: "tennis-backhand-dual-benchmark",
    sportId: "tennis",
    actionTypes: ["backhand", "one_handed_backhand", "two_handed_backhand"],
    libraryUrl: "https://www.playerdevelopment.usta.com/high_performance_technique/",
    categoryLabel: "Backhand development lens",
    whyThisReference: "The category reference provides a clear coaching sequence. The elite reference is selected by confirmed one- or two-handed backhand family so the athlete is not compared with the wrong movement.",
    checkpoints: [
      { id: "preparation", label: "Unit turn", focus: "Organize the shoulders and racket before the ball enters the strike zone.", eliteFocus: "World-class backhands prepare early while preserving rhythm and visual tracking." },
      { id: "loading", label: "Spacing and base", focus: "Arrive beside the ball with enough room for the hands and racket to accelerate.", eliteFocus: "Elite players create space with the feet and base rather than rescuing the stroke with the arms." },
      { id: "contact", label: "Contact window", focus: "Maintain stable body position while the racket travels through the intended line.", eliteFocus: "The one- and two-handed families differ, but both preserve a stable strike window suited to the incoming ball." },
      { id: "recovery", label: "Finish and reset", focus: "Complete the swing without losing balance, then recover immediately.", eliteFocus: "Elite players decelerate efficiently and reorganize for the next ball rather than holding the finish." },
    ],
    categoryReferences: [
      {
        id: "usta-backhand-development",
        tier: "category",
        title: "How to Master Your Backhand",
        organization: "United States Tennis Association",
        sourceUrl: "https://www.youtube.com/watch?v=uXLQhYrd6X0",
        youtubeId: "uXLQhYrd6X0",
        audience: ["foundation", "development", "performance"],
        description: "A governing-body coaching reference for preparation, spacing, forward movement, finish, and recovery.",
        rightsNote: "Public YouTube embed from the source channel; AceCoach does not download or redistribute the video.",
      },
    ],
    eliteReferences: [
      {
        id: "elite-two-handed-backhand",
        tier: "elite",
        title: "Taylor Fritz Two-Handed Backhand in Slow Motion",
        organization: "Top Tennis Training",
        sourceUrl: "https://www.youtube.com/watch?v=N_xHm-JwW2c",
        youtubeId: "N_xHm-JwW2c",
        actionTypes: ["backhand", "two_handed_backhand"],
        description: "An elite two-handed backhand exemplar for observing preparation, spacing, contact organization, extension, and recovery.",
        rightsNote: "Public YouTube embed from the source channel; availability and rights remain with the publisher.",
      },
      {
        id: "elite-one-handed-backhand",
        tier: "elite",
        title: "Stan Wawrinka One-Handed Backhand in Slow Motion",
        organization: "Top Tennis Training",
        sourceUrl: "https://www.youtube.com/watch?v=SlgMvQQrYhg",
        youtubeId: "SlgMvQQrYhg",
        actionTypes: ["one_handed_backhand"],
        description: "An elite one-handed backhand exemplar for observing early preparation, spacing, forward contact, extension, and balanced recovery.",
        rightsNote: "Public YouTube embed from the source channel; availability and rights remain with the publisher.",
      },
    ],
    disclaimer: "One- and two-handed backhands are separate movement families. The elite exemplar is selected only after movement confirmation and is not used to create an unsupported percentile.",
  },
  {
    id: "tennis-serve-dual-benchmark",
    sportId: "tennis",
    actionTypes: ["serve", "overhead"],
    libraryUrl: "https://www.playerdevelopment.usta.com/high_performance_technique/",
    categoryLabel: "Serve development lens",
    whyThisReference: "The category reference teaches a coordinated serving sequence. The elite footage illustrates rhythm and whole-body organization without implying that every athlete should copy one exact toss or stance.",
    checkpoints: [
      { id: "preparation", label: "Start and toss", focus: "Build a repeatable start and place the toss where the body can move upward into contact.", eliteFocus: "Elite servers use different rituals, while repeatable rhythm and a usable toss window remain consistent." },
      { id: "loading", label: "Load and organize", focus: "Coordinate the legs, trunk, and hitting arm rather than forcing the serve with the arm alone.", eliteFocus: "High-level serves show a linked upward chain and efficient sequencing." },
      { id: "contact", label: "Upward contact", focus: "Reach into a stable contact window while maintaining body control.", eliteFocus: "Elite contact positions vary with serve direction and spin, but extension and balance are purposeful." },
      { id: "recovery", label: "Landing", focus: "Land balanced and prepare for the first ball after the serve.", eliteFocus: "World-class servers flow into a controlled landing and immediate court readiness." },
    ],
    categoryReferences: [
      {
        id: "usta-serve-development",
        tier: "category",
        title: "How to Improve Your Serve",
        organization: "United States Tennis Association",
        sourceUrl: "https://www.youtube.com/watch?v=gKAv2xiYecY",
        youtubeId: "gKAv2xiYecY",
        audience: ["foundation", "development", "performance"],
        description: "A governing-body serve reference for preparation, coordinated upward action, contact, landing, and recovery.",
        rightsNote: "Public YouTube embed from the source channel; AceCoach does not download or redistribute the video.",
      },
    ],
    eliteReferences: [
      {
        id: "elite-serve-slow-motion",
        tier: "elite",
        title: "Casper Ruud Forehand and Serve in Slow Motion",
        organization: "Slow-Mo Tennis",
        sourceUrl: "https://www.youtube.com/watch?v=02LEQoDx5Cs",
        youtubeId: "02LEQoDx5Cs",
        actionTypes: ["serve", "overhead"],
        description: "High-frame-rate professional practice footage for observing serve rhythm, upward sequencing, contact organization, landing, and first-ball readiness.",
        rightsNote: "Public YouTube embed from the source channel; availability and rights remain with the publisher.",
      },
    ],
    disclaimer: "Consumer video cannot directly measure joint loading, racket speed, spin, or official ball-contact timing. The visual comparison supports coaching interpretation only.",
  },
  {
    id: "tennis-volley-reference",
    sportId: "tennis",
    actionTypes: ["volley", "forehand_volley", "backhand_volley"],
    libraryUrl: "https://www.playerdevelopment.usta.com/high_performance_technique/",
    categoryLabel: "Volley development lens",
    whyThisReference: "The current pack emphasizes a governing-body category reference. A rights-cleared elite volley library remains a future enhancement.",
    checkpoints: [
      { id: "preparation", label: "Ready position", focus: "Stay balanced with the racket organized in front of the body.", eliteFocus: "Elite volleyers preserve a compact, adaptable ready position." },
      { id: "loading", label: "First step", focus: "Use the feet to create position rather than reaching with the arm.", eliteFocus: "High-level net play uses the first step and body line to manage spacing." },
      { id: "contact", label: "Compact contact", focus: "Meet the ball with a quiet racket path and stable body support.", eliteFocus: "Elite contact remains compact, stable, and suited to the incoming pace." },
      { id: "recovery", label: "Reset", focus: "Return the racket and body to a neutral ready position quickly.", eliteFocus: "World-class volleyers reset rapidly for the next exchange." },
    ],
    categoryReferences: [
      {
        id: "usta-volley",
        tier: "category",
        title: "How to Volley",
        organization: "United States Tennis Association",
        sourceUrl: "https://www.youtube.com/watch?v=SYR2DS1BnEg",
        youtubeId: "SYR2DS1BnEg",
        audience: ["foundation", "development", "performance"],
        description: "A governing-body model for ready position, compact preparation, stable contact, and quick recovery.",
        rightsNote: "Public YouTube embed from the source channel; AceCoach does not download or redistribute the video.",
      },
    ],
    eliteReferences: [],
    disclaimer: "Match context, incoming pace, contact height, and tactical intent can legitimately change volley shape.",
  },
  {
    id: "tennis-slice-reference",
    sportId: "tennis",
    actionTypes: ["slice", "backhand_slice"],
    libraryUrl: "https://www.playerdevelopment.usta.com/high_performance_technique/",
    categoryLabel: "Slice backhand development lens",
    whyThisReference: "The category reference teaches preparation, spacing, a controlled racket path, contact, and recovery. A licensed elite slice pack remains to be curated.",
    checkpoints: [
      { id: "preparation", label: "Preparation", focus: "Prepare the racket and shoulders before the ball reaches the strike zone.", eliteFocus: "High-level slice preparation is early and adaptable." },
      { id: "loading", label: "Spacing", focus: "Create enough room for the racket to travel through contact without collapsing the arm.", eliteFocus: "Elite players use the feet to preserve a usable strike corridor." },
      { id: "contact", label: "Contact and path", focus: "Maintain a stable contact window and a controlled forward-and-downward path.", eliteFocus: "Elite slice shape changes with intent, but contact stability and racket control remain clear." },
      { id: "recovery", label: "Balance", focus: "Finish under control and recover without drifting away from the next position.", eliteFocus: "High-level slice supports immediate tactical recovery." },
    ],
    categoryReferences: [
      {
        id: "usta-slice",
        tier: "category",
        title: "How to Hit a Slice Backhand",
        organization: "United States Tennis Association",
        sourceUrl: "https://www.youtube.com/watch?v=wN_mIurkLEQ",
        youtubeId: "wN_mIurkLEQ",
        audience: ["foundation", "development", "performance"],
        description: "A governing-body coaching reference for preparation, spacing, racket path, stable contact, and recovery.",
        rightsNote: "Public YouTube embed from the source channel; AceCoach does not download or redistribute the video.",
      },
    ],
    eliteReferences: [],
    disclaimer: "Slice shape changes with defensive, neutral, and attacking intent. The reference is a visual foundation, not one compulsory technique.",
  },
  {
    id: "badminton-official-reference",
    sportId: "badminton",
    actionTypes: ["overhead_clear", "smash", "drop_shot", "serve", "net_play", "footwork"],
    libraryUrl: "https://development.bwfbadminton.com/coaches/video-clips",
    categoryLabel: "Badminton development lens",
    whyThisReference: "Official BWF coach-education resources are used as the category lens. A licensed, phase-synchronized elite library is still required for automated three-way comparison.",
    checkpoints: [
      { id: "preparation", label: "Preparation", focus: "Move early and organize the body before the overhead or lunge action.", eliteFocus: "Elite players create time through early reading and efficient movement." },
      { id: "loading", label: "Whole-body loading", focus: "Coordinate the legs, trunk, and racket arm.", eliteFocus: "World-class power emerges from a linked full-body sequence." },
      { id: "contact", label: "Contact", focus: "Reach a stable contact window suited to the intended shot.", eliteFocus: "Elite contact adapts to tactical intent while preserving control." },
      { id: "recovery", label: "Recovery", focus: "Land or push off efficiently and recover toward the next base position.", eliteFocus: "High performers organize the next movement immediately." },
    ],
    categoryReferences: [
      {
        id: "bwf-coach-library",
        tier: "category",
        title: "BWF Coach Education Video Clips",
        organization: "Badminton World Federation",
        sourceUrl: "https://development.bwfbadminton.com/coaches/video-clips",
        audience: ["foundation", "development", "performance"],
        description: "Official coach-education examples covering badminton movement and stroke development.",
        rightsNote: "External governing-body library; AceCoach links to the source and does not redistribute its media.",
      },
    ],
    eliteReferences: [],
    disclaimer: "The current badminton pack links to official coaching resources but does not claim phase-synchronized elite comparison.",
  },
  {
    id: "cricket-official-reference",
    sportId: "cricket",
    actionTypes: ["batting_front_foot", "batting_back_foot", "fast_bowling", "spin_bowling", "fielding_throw", "wicketkeeping"],
    libraryUrl: "https://play.cricket.com.au/learn/coach",
    categoryLabel: "Cricket development lens",
    whyThisReference: "Official Cricket Australia coaching resources provide the current category lens. Ball, bat, crease, and release-event tracking are still required for high-confidence elite comparison.",
    checkpoints: [
      { id: "preparation", label: "Preparation", focus: "Build a repeatable setup suited to the selected cricket skill.", eliteFocus: "Elite preparation preserves balance, timing, and tactical options." },
      { id: "loading", label: "Alignment and loading", focus: "Use the base and trunk to support the action.", eliteFocus: "High performers organize the kinetic chain efficiently." },
      { id: "contact", label: "Impact or release", focus: "Organize the body around the intended contact or release window.", eliteFocus: "Elite impact or release is task-specific and should not be reduced to one pose." },
      { id: "recovery", label: "Follow-through", focus: "Complete the action safely and prepare for the next play.", eliteFocus: "World-class players transition efficiently into the next task." },
    ],
    categoryReferences: [
      {
        id: "cricket-australia-coach-library",
        tier: "category",
        title: "PlayCricket Learn — Coaching Resources",
        organization: "Cricket Australia",
        sourceUrl: "https://play.cricket.com.au/learn/coach",
        audience: ["foundation", "development", "performance"],
        description: "Official drills and practical resources for batting, bowling, fielding, and wicketkeeping.",
        rightsNote: "External governing-body library; AceCoach links to the source and does not redistribute its media.",
      },
    ],
    eliteReferences: [],
    disclaimer: "The current cricket reference is educational rather than an automated elite benchmark.",
  },
  {
    id: "squash-official-reference",
    sportId: "squash",
    actionTypes: ["forehand_drive", "backhand_drive", "serve", "volley", "lunge", "movement"],
    libraryUrl: "https://www.worldsquash.org/",
    categoryLabel: "Squash development lens",
    whyThisReference: "World Squash provides the current official development lens. A rights-cleared elite stroke library remains a future pack.",
    checkpoints: [
      { id: "preparation", label: "Early preparation", focus: "Prepare the racket before the final approach so the swing stays compact and adaptable.", eliteFocus: "Elite squash players prepare early while reading court pressure." },
      { id: "loading", label: "Approach and lunge", focus: "Create balanced spacing with a controlled final step and stable trunk.", eliteFocus: "High performers brake, strike, and push away efficiently." },
      { id: "contact", label: "Contact window", focus: "Strike beside the body with enough room for a clean racket path.", eliteFocus: "Elite spacing adapts to ball height and tactical intent." },
      { id: "recovery", label: "Return to the T", focus: "Push away efficiently and recover toward the next likely position.", eliteFocus: "World-class recovery is integrated into the stroke." },
    ],
    categoryReferences: [
      {
        id: "world-squash-foundations",
        tier: "category",
        title: "World Squash — Player and Coach Foundations",
        organization: "World Squash Federation",
        sourceUrl: "https://www.worldsquash.org/",
        audience: ["foundation", "development", "performance"],
        description: "Official governing-body starting point for squash coaching, movement, and skill-development principles.",
        rightsNote: "External governing-body library; AceCoach links to the source and does not redistribute its media.",
      },
    ],
    eliteReferences: [],
    disclaimer: "Squash technique changes with court position, pressure, ball height, and tactical intent.",
  },
  {
    id: "table-tennis-official-reference",
    sportId: "table_tennis",
    actionTypes: ["backhand_drive", "forehand_drive", "forehand_loop", "serve", "push", "footwork"],
    libraryUrl: "https://www.ittfeducation.com/",
    categoryLabel: "Table-tennis development lens",
    whyThisReference: "ITTF Education provides the current governing-body development lens. Racket-face, ball spin, and exact impact timing remain outside the current video model.",
    checkpoints: [
      { id: "preparation", label: "Ready and compact", focus: "Organize the racket and body early without an oversized backswing.", eliteFocus: "Elite players preserve compact readiness and rapid adaptability." },
      { id: "loading", label: "Base and timing", focus: "Use the legs and trunk to support the stroke while staying appropriately positioned.", eliteFocus: "High performers link footwork and body timing to the stroke." },
      { id: "contact", label: "Contact and acceleration", focus: "Meet the ball in a repeatable window with a coordinated action.", eliteFocus: "Elite contact varies with spin and placement while preserving control." },
      { id: "recovery", label: "Immediate reset", focus: "Return the racket and body to neutral before the opponent's next contact.", eliteFocus: "World-class reset speed supports the next exchange." },
    ],
    categoryReferences: [
      {
        id: "ittf-education",
        tier: "category",
        title: "ITTF Education — Technique and Footwork",
        organization: "International Table Tennis Federation Education",
        sourceUrl: "https://www.ittfeducation.com/",
        audience: ["foundation", "development", "performance"],
        description: "Official education resources for compact preparation, timing, contact, footwork, balance, and rapid recovery.",
        rightsNote: "External governing-body library; AceCoach links to the source and does not redistribute its media.",
      },
    ],
    eliteReferences: [],
    disclaimer: "This is a governing-body coaching lens, not a statistical cohort or automated elite benchmark.",
  },
];

export function getReferenceExperience(
  sportId: string,
  actionType: string,
  context?: AthleteReferenceContext,
): SelectedReferenceExperience | null {
  const normalized = normalizeAction(actionType);
  const experience = references.find((item) => item.sportId === sportId && item.actionTypes.includes(normalized))
    ?? references.find((item) => item.sportId === sportId)
    ?? null;
  if (!experience) return null;
  return {
    ...experience,
    categoryReference: chooseCategoryReference(experience.categoryReferences, context),
    eliteReference: chooseEliteReference(experience.eliteReferences, normalized),
    categoryLens: categoryLens(context),
  };
}
