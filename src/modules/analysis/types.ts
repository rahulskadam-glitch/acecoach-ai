export type EvidenceLevel =
  | "peer_reviewed"
  | "governing_body"
  | "public_coaching_reference"
  | "coach_consensus"
  | "development_rule";

export type DrillDefinition = {
  id: string;
  name: string;
  purpose: string;
  cue: string;
  dosage: string;
  successMetric: string;
  regression?: string;
  progression?: string;
  targetFaultIds?: string[];
  ontologyVersion?: string;
  policyId?: string;
  policyVersion?: string;
  knowledgeControlled?: boolean;
};

export type EvidenceReference = {
  id: string;
  title: string;
  organization: string;
  level: EvidenceLevel;
  use: string;
  year?: number;
  url?: string;
  scope?: string[];
};

export type PhaseDefinition = {
  id: string;
  label: string;
  weight: number;
  coachingFocus: string;
};

export type MetricDefinition = {
  id: string;
  label: string;
  weight: number;
  explanation: string;
};

export type MovementPack = {
  sportId: string;
  actionType: string;
  displayName: string;
  summary: string;
  phases: PhaseDefinition[];
  metrics: MetricDefinition[];
  strengths: string[];
  priorities: Array<{
    title: string;
    finding: string;
    impact: string;
    cue: string;
    drillIds: string[];
  }>;
  drills: DrillDefinition[];
  evidence: EvidenceReference[];
  filmingInstruction: string;
  limitations: string[];
};

export type AthleteContext = {
  playingLevel?: string | null;
  ageBand?: string | null;
  dominantSide?: string | null;
  primaryGoal?: string | null;
  heightCm?: number | null;
};

export type EngineManifest = {
  engineVersion: string;
  poseModelVersion: string;
  biomechanicsVersion: string;
  scoringVersion: string;
  biomechanicalProfileVersion?: string;
  classifierVersion?: string;
  temporalModelVersion?: string;
  signalAnalyticsVersion?: string;
  knowledgeVersion: string;
  ontologyVersion?: string;
  ontologyManifestHash?: string;
  ontologyReasonerVersion?: string;
  knowledgeControlVersion?: string;
  knowledgeControlPolicyIds?: string[];
  evidenceVersion?: string;
  reportVersion: string;
  analysisMode: string;
  runtime?: Record<string, string>;
  runtimeSignature?: string;
};

export type BiomechanicalMetric = {
  id: string;
  label: string;
  phase: "preparation" | "backswing" | "loading" | "acceleration" | "contact" | "follow_through";
  region: string;
  value: number | null;
  displayValue: string;
  unit: string;
  status: "available" | "unavailable";
  confidence: number;
  measurementBasis: string;
  playerMeaning: string;
};

export type BiomechanicalPhaseSummary = {
  id: BiomechanicalMetric["phase"];
  label: string;
  score: number | null;
  metricCount: number;
  availableMetricCount: number;
  confidence: number;
};

export type BiomechanicalLinkage = {
  id: string;
  source: { id: string; label: string; peakTimestampSeconds: number | null };
  target: { id: string; label: string; peakTimestampSeconds: number | null };
  gapSeconds: number | null;
  status: "connected" | "delayed_transfer" | "out_of_sequence" | "unavailable";
  confidence: number;
  explanation: string;
};

export type BiomechanicalProfile = {
  version: string;
  actionType: string;
  metricCount: 106 | number;
  availableMetricCount: number;
  unavailableMetricCount: number;
  measurementStatement: string;
  phases: BiomechanicalPhaseSummary[];
  linkages: BiomechanicalLinkage[];
  connectedLinkCount: number;
  linkCount: number;
  metrics: BiomechanicalMetric[];
};

export type FrameMetric = {
  frameIndex: number;
  timestampSeconds: number;
  visibility: number;
  elbowAngle: number | null;
  shoulderAngle: number | null;
  kneeAngle: number | null;
  shoulderPelvisSeparation: number | null;
  baseWidthNormalized: number | null;
  wristSpeedNormalizedPerSecond: number;
  wristSpeedWorldPerSecond?: number;
  comSpeedNormalizedPerSecond?: number;
  comSpeedWorldPerSecond?: number; // legacy field
  comShapeSpeedWorldPerSecond?: number;
  comSpeedImageBodyScaledPerSecond?: number;
  dominantKneeAngle?: number | null;
  oppositeKneeAngle?: number | null;
  dominantElbowAngle?: number | null;
  oppositeElbowAngle?: number | null;
  dominantShoulderAngle?: number | null;
  oppositeShoulderAngle?: number | null;
  dominantHipAngle?: number | null;
  oppositeHipAngle?: number | null;
  dominantAnkleAngle?: number | null;
  oppositeAnkleAngle?: number | null;
  trunkAngleDegrees?: number | null;
  headToComNormalized?: number | null;
  handToTorsoNormalized?: number | null;
  motionEnergy?: number;
  repetitionIndex?: number | null;
  phase?: string | null;
  centerOfMass?: { x: number; y: number } | null;
  keyLandmarks?: Record<string, { x: number; y: number; visibility: number }>;
  interpolationAlpha?: number;
};

export type RepetitionSummary = {
  index: number;
  startFrame: number;
  peakFrame: number;
  endFrame: number;
  startSeconds: number;
  peakSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  peakMotion: number;
  meanVisibility: number;
  headMovementRange?: number | null;
  phaseTimeline: Array<{
    phase: string;
    frameIndex: number;
    timestampSeconds: number;
  }>;
};


export type PerformanceStory = {
  identity: string;
  rootCauseHypothesis: string;
  transferRisk: string;
  nextMilestone: string;
  coachPrinciple: string;
  policyId?: string;
  policyVersion?: string;
  ontologyVersion?: string;
  knowledgeControlled?: boolean;
};

export type VisualMoment = {
  id: string;
  kind: "strength" | "priority" | "checkpoint";
  label: string;
  title: string;
  explanation: string;
  cue?: string;
  frameIndex?: number | null;
  timestampSeconds?: number | null;
  faultId?: string;
  policyId?: string;
  policyVersion?: string;
  ontologyVersion?: string;
  knowledgeControlled?: boolean;
};

export type MeasurementCoverage = {
  measured: Array<{ label: string; detail: string }>;
  estimated: Array<{ label: string; detail: string }>;
  unavailable: Array<{ label: string; detail: string }>;
};

export type PracticePlan = {
  title: string;
  primaryGoal: string;
  cue: string;
  policyId?: string;
  policyVersion?: string;
  ontologyVersion?: string;
  knowledgeControlled?: boolean;
  sessions: Array<{
    id: string;
    day: string;
    title: string;
    duration: string;
    cue?: string;
    objective: string;
    drillName: string;
    dosage: string;
    successMetric: string;
  }>;
};


export type CoachingPlaybook = {
  todayFocus: string;
  athleteGoal?: string | null;
  feelCue: string;
  visualCue: string;
  commonCompensation: string;
  successTest: string;
  transferChallenge: string;
  coachQuestion: string;
  policyId?: string;
  policyVersion?: string;
  ontologyVersion?: string;
  knowledgeControlled?: boolean;
};

export type RepetitionInsights = {
  policyId?: string;
  policyVersion?: string;
  knowledgeControlled?: boolean;
  clearestReferenceRepetition: number | null;
  consistencyScore: number | null;
  consistencyLabel: string;
  explanation: string;
  repetitions: Array<{
    index: number;
    timestampSeconds: number;
    reviewScore: number;
    label: string;
    strengths: string[];
    watchouts: string[];
  }>;
  rhythmProfile?: {
    medianDurationSeconds: number;
    durationIqrSeconds: number;
    durationCv: number;
    medianPeakMotion: number;
    peakMotionIqr: number;
    peakMotionCv: number;
  } | null;
  outlierRepetitions?: number[];
  phaseTiming?: Array<{ phase: string; share: number }>;
};

export type AnalysisReport = {
  overallScore: number | null;
  scoreStatus: string;
  scoreLabel: string;
  confidence: number;
  captureQuality: {
    score: number;
    grade?: string;
    positives: string[];
    limitations: string[];
    diagnostics?: Record<string, number>;
  };
  qualityGate: {
    status: string;
    capturePassed: boolean;
    movementConfirmed: boolean;
    sportSupported?: boolean;
    repetitionDetected: boolean;
    repetitionCount?: number;
    minimumRepetitionsForScore?: number;
    canUseTechniqueScore: boolean;
    messages: string[];
  };
  phaseScores: Array<{
    id: string;
    label: string;
    score: number | null;
    note: string;
    confidence?: number;
    basis?: string;
    policyId?: string;
    policyVersion?: string;
    knowledgeControlled?: boolean;
  }>;
  metricScores: Array<{
    id: string;
    label: string;
    score: number | null;
    explanation: string;
    confidence?: number;
    basis?: string;
    policyId?: string;
    policyVersion?: string;
    knowledgeControlled?: boolean;
  }>;
  strengths: Array<{
    title: string;
    evidence: string;
    frameIndex?: number | null;
    timestampSeconds?: number | null;
    confidence?: number;
    policyId?: string;
    policyVersion?: string;
    ontologyVersion?: string;
    knowledgeControlled?: boolean;
  }>;
  priorities: Array<{
    rank: number;
    title: string;
    finding: string;
    impact: string;
    nextStep?: string;
    cue: string;
    frameIndex?: number | null;
    timestampSeconds?: number | null;
    confidence?: number;
    measurementBasis?: string;
    faultId?: string;
    ontologyVersion?: string;
    policyId?: string;
    policyVersion?: string;
    knowledgeControlled?: boolean;
  }>;
  drills: DrillDefinition[];
  nextSession: {
    objective: string;
    recordingPlan: string;
    successCriteria: string[];
    policyId?: string;
    policyVersion?: string;
    ontologyVersion?: string;
    knowledgeControlled?: boolean;
    sessionPlan?: Array<{
      block: string;
      duration: string;
      focus: string;
    }>;
  };
  coachSummary: {
    headline: string;
    strongestQuality: string;
    mainPriority: string;
    whyItMatters: string;
    practiceFocus: string[];
    policyId?: string;
    policyVersion?: string;
    ontologyVersion?: string;
    knowledgeControlled?: boolean;
    contextStatement?: string;
    coachVerdict?: string;
    executiveBullets?: Array<{
      id: string;
      label: string;
      text: string;
      timestampSeconds?: number | null;
    }>;
    pyramidSummary?: {
      headline: string;
      bottomLine: string;
      synthesisNote: string;
      strengths: Array<{
        id: string;
        title: string;
        summary: string;
        whyItMatters: string;
        cue?: string;
        timestampSeconds: number | null;
        bodyRegionId: string;
        phase: string;
      }>;
      improvements: Array<{
        id: string;
        title: string;
        summary: string;
        whyItMatters: string;
        cue?: string;
        timestampSeconds: number | null;
        bodyRegionId: string;
        phase: string;
      }>;
      firstAction: {
        title: string;
        reason: string;
        cue: string;
        drillName: string;
        successMetric: string;
      };
      framework?: Array<{
        id: string;
        step: number;
        label: string;
        title: string;
        status: "working" | "developing" | "priority" | "confirm";
        summary: string;
        coachCue: string;
        cameraBoundary?: string;
        checks?: Array<{
          id: string;
          label: string;
          status: "working" | "developing" | "priority" | "confirm";
          finding: string;
          cameraBoundary?: string;
        }>;
        timestampSeconds: number | null;
        bodyRegionId: string;
        phase: string;
      }>;
      audit?: {
        version: string;
        title: string;
        synthesis: string;
        stylePrinciple: string;
        checkpoints: Array<{
          id: string;
          step: number;
          label: string;
          status: "working" | "developing" | "priority" | "confirm";
          summary: string;
          cue: string;
          measurement: string;
          cameraBoundary: string;
          contextNote: string;
          sourceIds: string[];
          timestampSeconds: number | null;
          bodyRegionId: string;
          phase: string;
          bodyChecks?: Array<{
            id: string;
            bodyPart: string;
            status: "working" | "developing" | "priority" | "confirm";
            finding: string;
            measurementBasis: string;
            cameraBoundary?: string;
          }>;
        }>;
      };
    };
  };
  performanceStory: PerformanceStory;
  visualMoments: VisualMoment[];
  measurementCoverage: MeasurementCoverage;
  practicePlan: PracticePlan;
  coachingPlaybook?: CoachingPlaybook;
  repetitionInsights?: RepetitionInsights;
  evidence: EvidenceReference[];
  safetyNote: string;
  limitations: string[];
  engineManifest?: EngineManifest;
  frameSummary?: {
    fps?: number;
    frameCount?: number;
    processedFrameCount?: number;
    displayedFrameCount?: number;
    displayFrameStride?: number;
    processedEveryFrame?: boolean;
    width?: number;
    height?: number;
    durationSeconds?: number;
    poseCoverage?: number;
    primaryRepetitionIndex?: number | null;
    dominantSide?: string;
    analysisAction?: string;
    aggregateMetrics?: Record<string, unknown>;
    frameMetrics?: FrameMetric[];
    biomechanicalProfile?: BiomechanicalProfile;
    analysisContext?: {
      cameraAngle: string;
      cameraAngleLabel: string;
      shotSituation: string;
      shotSituationLabel: string;
      shotIntent: string;
      shotIntentLabel: string;
      athleteQuestion: string | null;
      source: "athlete_supplied" | "partially_supplied_or_unspecified";
      statement: string;
      athleteHeightCm?: number | null;
      heightSource?: "athlete_supplied" | "not_supplied";
      calibrationStatement?: string;
    };
    athleteCalibration?: {
      status: "height_aware" | "body_relative_only";
      heightCm: number | null;
      uses: string[];
      limitation: string;
    };
    videoRegistration?: {
      version: string;
      timestampSource: string;
      decoderTimestampCoverage: number;
      medianFrameIntervalSeconds: number;
      presentationDurationSeconds: number;
      variableFrameRateDetected: boolean;
      frameIntervalVariation: number;
      encodedSize: { width: number; height: number };
      decodedDisplaySize: { width: number | null; height: number | null };
      rotationDegrees: number;
      rotationAppliedByDecoder: boolean;
      mirrored: boolean;
      cropNormalized: { left: number; top: number; width: number; height: number };
      poseInput: { width: number | null; height: number | null; resizeMode: string };
      videoFit: "contain";
      landmarkSpace: "decoded_display_normalized";
    };
    bodyRegionReview?: Array<{
      id: string;
      title: string;
      status: "strength" | "developing" | "priority" | "needs_confirmation" | "not_visible";
      coachNote: string;
      whyItMatters: string;
      cue: string;
      phase: string;
      timestampSeconds: number | null;
      measurementStatus: "video_estimate" | "athlete_confirmation" | "not_visible";
      evidence: Array<{
        id: string;
        label: string;
        displayValue: string;
        confidence: number;
        measurementBasis: string;
      }>;
    }>;
  };
  movementTimeline?: Array<{
    phase: string;
    frameIndex: number;
    timestampSeconds: number;
    coachingFocus?: string;
    repetitionIndex?: number;
  }>;
  repetitions?: RepetitionSummary[];
  movementClassification?: {
    detectedAction: string;
    detectedLabel: string;
    confidence: number;
    alternatives: Array<{ action: string; label: string; score: number }>;
    reasons: string[];
    selectedAction: string;
    selectedLabel: string;
    mismatch: boolean;
    requiresConfirmation: boolean;
    classifierVersion: string;
    calibrationStatus?: string;
    analysisAction?: string;
    analysisActionLabel?: string;
    decisionMode?: string;
    provisional?: boolean;
    confirmedAction?: string | null;
    confirmedActionLabel?: string | null;
  };
  coachingAreas?: Array<{
    id: string;
    label: string;
    score: number;
    status: "strength" | "developing" | "priority";
    observation: string;
    coachingGoal: string;
    cue: string;
    whyItMatters?: string;
    confidence?: number;
    measurementBasis?: string;
    frameIndex?: number | null;
    timestampSeconds?: number | null;
  }>;
  referenceComparison?: {
    cohortLabel: string;
    comparisonType: string;
    status?: string;
    disclaimer: string;
    nextStep?: string;
    policyId?: string;
    policyVersion?: string;
    knowledgeControlled?: boolean;
    areas: Array<{
      id: string;
      label: string;
      assessment: "within_reference" | "slightly_below_reference" | "below_reference";
      note: string;
    }>;
  };
  nextGenerationStory?: import("@/features/biomechanics/contracts/ontology").DeepCoachingInsight;
  ontologyReasoning?: {
    status: "FAULT_SUSPECTED" | "FAULT_CONFIRMED" | "NO_SUPPORTED_FAULT";
    priorityScore: number;
    candidateCount: number;
    evaluatedFaultIds: string[];
    cameraSupport: string;
    sourceIds: string[];
    ontologyVersion: string;
    manifestHash: string;
    policiesApplied: string[];
    skippedPolicies?: Record<string, string>;
    gatedCapabilities: string[];
    knowledgeLayerStatus?: {
      version: string;
      sourceCoverage: {
        status: "covered" | "missing";
        sourceIds: string[];
        qualitativeConstructs: string[];
        numericBenchmarkGranted: false;
      };
      personalBaseline: {
        status: "collection_ready";
        minimumPriorContextMatchedSessions: number;
        minimumTotalRepetitions: number;
        minimumMeasurementConfidence: number;
        maximumCaptureScoreDifference: number;
        exactMatchDimensions: string[];
      };
      matchedCohort: {
        status: "available" | "dormant";
        eligibleVersionCount: number;
        reason: string | null;
      };
      outcomeLabels: { status: string; causalClaimsAllowed: false };
      expertAnnotation: { status: string; minimumIndependentRaters: number };
      interventionValidation: { status: string; causalClaimsAllowed: false };
      capabilities: Record<string, { eligible: boolean; missing: string[] }>;
    };
    rejectedCandidates?: Array<{
      faultId: string;
      chapterId: string;
      eligible: boolean;
      cameraSupported: boolean;
      matchedEvidence: Array<Record<string, unknown>>;
      missingRequiredMetricIds: string[];
      expectedMetricIds: string[];
      reasons: string[];
      directionSupported: boolean;
    }>;
    findings: Array<{
      id: string;
      rank: number;
      role: "PRIMARY" | "SECONDARY";
      chapterId: string;
      label: string;
      faultId: string;
      ontologyTitle: string;
      domain: string;
      status: "FAULT_SUSPECTED" | "FAULT_CONFIRMED";
      score: number;
      priorityScore: number;
      confidence: number;
      summary: string;
      why: string;
      correction: string;
      cue: string;
      watch: string;
      phaseOrigin: string;
      phaseVisibleEffect: string;
      overlayMarkers: string[];
      sourceIds: string[];
      evidenceEvaluation?: {
        eligible: boolean;
        cameraSupported: boolean;
        matchedEvidence: Array<Record<string, unknown>>;
        missingRequiredMetricIds: string[];
        expectedMetricIds: string[];
        reasons: string[];
        directionSupported: boolean;
      };
      ambiguousWith?: string[];
      evidence: Array<{
        areaId: string;
        label: string;
        observation: string;
        score: number;
        confidence: number;
        measurementBasis: string;
        timestampSeconds?: number | null;
      }>;
      drill?: {
        id: string;
        name: string;
        purpose?: string;
        dosage: string;
        cue?: string;
        success: string;
        setup?: string | null;
        action?: string | null;
        stopCondition?: string | null;
        reassessment?: string | null;
        targetFaultIds?: string[];
      } | null;
    }>;
    strengthReview: Array<{
      chapterId: string;
      label: string;
      score: number;
      summary: string;
      evidence: Array<{ areaId: string; label: string; observation: string; score: number; confidence: number; measurementBasis: string }>;
    }>;
    movementChain: Array<{
      id: string;
      label: string;
      status: "priority" | "developing" | "strength" | "not_assessed";
      score: number | null;
      summary: string;
      faultId?: string | null;
      assessmentBasis?: "EVIDENCE_GATED_FAULT" | "MEASURED_CHAPTER_PRIORITY" | "MEASURED_CHAPTER_SCORE" | "INSUFFICIENT_MEASUREMENT_CONFIDENCE" | string;
      scoreRule?: "mean_of_reliably_measured_contributing_areas" | "suppressed_below_measurement_confidence_gate" | string;
      availabilityReason?: "LOW_LANDMARK_CONFIDENCE" | "NO_RELIABLE_MEASUREMENT" | "CAMERA_OR_OCCLUSION_LIMIT" | string | null;
      coachExplanation?: string | null;
      evidence?: Array<{
        areaId: string;
        label: string;
        score: number;
        confidence: number | null;
        measurementBasis: string | null;
        observation: string;
      }>;
    }>;
    assessmentPolicy?: {
      strengthMinimumScore: number;
      minimumMeasurementConfidence: number;
      measuredFocusFallback: "MEASURED_AREA_PRIORITY_ONLY" | string;
    };
  };
  knowledgeControl?: KnowledgeControlTrace;
};

export type KnowledgeControlDomain = {
  authorized: boolean;
  decision: string;
  policyIds: string[];
};

export type KnowledgeControlTrace = {
  status: "CONTROLLED";
  failClosed: true;
  policyVersion: string;
  ontologyVersion: string;
  manifestHash: string;
  domains: {
    calculations: KnowledgeControlDomain;
    insights: KnowledgeControlDomain;
    recommendations: KnowledgeControlDomain;
    benchmarks: KnowledgeControlDomain;
    records: KnowledgeControlDomain;
    report: KnowledgeControlDomain;
  };
  legacyRecordPolicy: string;
  reportFallbacksAllowed: false;
  contracts: {
    comparisons: {
      maximumCaptureScoreDifference: number;
      improvedScoreDelta: number;
      unchangedLowerScoreDelta: number;
      requireSameEngine: boolean;
      requireSameRuntime: boolean;
      requireSameContext: boolean;
      requireSameKnowledgePolicy: boolean;
      requireSameManifestHash: boolean;
    };
    longitudinal: {
      distributionSpreadDivisor: number;
      minimumHistorySessions: number;
      historyWindowSessions: number;
      meaningfulShiftPoints: number;
    };
  };
};
