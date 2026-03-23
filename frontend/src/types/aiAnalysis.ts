export const SkinCondition = {
  ACNE: "Acne",
  PORES: "Enlarged-Pores",
  SCARS: "Atrophic Scars",
  REDNESS: "Skin Redness",
  BLACKHEADS: "Blackheads",
  DARK_SPOTS: "Dark-Spots",
  BLACK_DOTS: "black_dots",
} as const;

export type SkinCondition = typeof SkinCondition[keyof typeof SkinCondition];

export interface ConditionScore {
  type: SkinCondition;
  score: number;
  count: number;
  severity: number;
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
  name: string;
  type: string;
  price: number;
  skinType: string;
  url: string;
}

export interface GlobalScoreResult {
  globalScore: number;
  conditionScores: ConditionScore[];
  totalDetections: number;
  analysis: {
    bestCondition: SkinCondition | null;
    worstCondition: SkinCondition | null;
    dominantCondition: SkinCondition | null;
  };
  recommendations?: SkinProduct[];
}

export interface UserSkinProfile {
  skinType: 'Oily' | 'Dry' | 'Combination' | 'Sensitive' | 'Normal';
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  concerns: string[];
  imageBase64?: string;
}
