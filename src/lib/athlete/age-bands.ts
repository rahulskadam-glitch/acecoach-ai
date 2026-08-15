export const PLAYER_AGE_BANDS = [
  { value: "13_17", label: "13–17" },
  { value: "18_24", label: "18–24" },
  { value: "25_34", label: "25–34" },
  { value: "35_44", label: "35–44" },
  { value: "45_54", label: "45–54" },
  { value: "55_plus", label: "55+" },
] as const;

export type PlayerAgeBand = (typeof PLAYER_AGE_BANDS)[number]["value"];

/** Convert historical profile and intake values to the current player-facing bands. */
export function normalizePlayerAgeBand(value: string | null | undefined): PlayerAgeBand | "" {
  switch (value) {
    case "under_10":
    case "10_12":
    case "under_13":
    case "13_15":
    case "16_18":
    case "13_17":
      return "13_17";
    case "18_to_34":
    case "19_29":
    case "18_24":
      return "18_24";
    case "25_34":
      return "25_34";
    case "35_to_54":
    case "30_39":
    case "35_44":
      return "35_44";
    case "40_49":
    case "45_54":
      return "45_54";
    case "50_59":
    case "60_plus":
    case "55_plus":
      return "55_plus";
    default:
      return "";
  }
}

export function requiresGuardianConfirmation(value: string | null | undefined) {
  return normalizePlayerAgeBand(value) === "13_17";
}
