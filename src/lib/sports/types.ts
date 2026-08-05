export type SportId = "tennis" | "badminton" | "squash" | "cricket" | "table_tennis";

export type SportAction = {
  id: string;
  label: string;
  category: "stroke" | "serve" | "movement" | "delivery" | "shot";
};

export type SportDefinition = {
  id: SportId;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  heroHeadline: string;
  heroDescription: string;
  coachingFocus: [string, string];
  filmingTips: string[];
  participantLabel: string;
  venueLabel: string;
  actions: SportAction[];
  profileGoals: string[];
  rankingSystems: string[];
  biomechanics: string[];
  roleOptions: string[];
  playingStyleOptions: string[];
  enabled: boolean;
};
