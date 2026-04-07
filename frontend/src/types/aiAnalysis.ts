export const SkinCondition = {
  ACNE: "Acne",
  PORES: "Enlarged-Pores",
  SCARS: "Atrophic Scars",
  REDNESS: "Skin Redness",
  BLACKHEADS: "Blackheads",
  DARK_SPOTS: "Dark-Spots",
  BLACK_DOTS: "black_dots",
  HYDRATION: "Hydration",
  WRINKLES: "Wrinkles",
} as const;

export type SkinCondition = typeof SkinCondition[keyof typeof SkinCondition];

export interface ConditionScore {
  type: SkinCondition;
  score: number | null;
  count: number;
  severity: number | null;
  evaluated?: boolean;
  notEvaluatedReason?: string | null;
}

export interface ConditionWeights {
  acne: number;
  pores: number;
  scars: number;
  redness: number;
  blackheads: number;
  darkSpots: number;
  blackDots: number;
}

export interface SkinProduct {
  id?: string;
  name: string;
  type: string;
  price: number;
  skinType: string;
  url: string;
  reason?: string;
}

export interface GlobalScoreResult {
  globalScore: number;
  conditionScores: ConditionScore[];
  totalDetections: number;
  skinAge?: number;
  skinAgeRationale?: string;
  analysis: {
    bestCondition: SkinCondition | null;
    worstCondition: SkinCondition | null;
    dominantCondition: SkinCondition | null;
  };
  recommendations?: SkinProduct[];
  userInputs?: Partial<UserSkinProfile>;
  metaWeighting?: { aiWeight: number; userWeight: number };
  combinedInsights?: Record<string, {
    aiScore: number | null;
    userScore?: number;
    combinedScore: number;
    weight: { ai: number; user: number };
  }>;
}

export interface UserSkinProfile {
  skinType: 'Oily' | 'Dry' | 'Combination' | 'Sensitive' | 'Normal';
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  concerns: string[];
  imageBase64?: string;
  imagesBase64?: string[];
  acneLevel?: number;
  blackheadsLevel?: number;
  poreSize?: number;
  wrinklesDepth?: number;
  sensitivityLevel?: number;
  hydrationLevel?: number;
  rednessLevel?: number;
}
