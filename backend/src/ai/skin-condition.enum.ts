export enum SkinCondition {
  ACNE = "Acne",
  PORES = "Enlarged-Pores",
  SCARS = "Atrophic Scars",
  REDNESS = "Skin Redness",
  BLACKHEADS = "Blackheads",
  DARK_SPOTS = "Dark-Spots",
  BLACK_DOTS = "black_dots",
}

export const SKIN_CONDITION_LABELS: Record<SkinCondition, string> = {
  [SkinCondition.ACNE]: "Acné",
  [SkinCondition.PORES]: "Pores dilatés",
  [SkinCondition.SCARS]: "Cicatrices atrophiques",
  [SkinCondition.REDNESS]: "Rougeurs",
  [SkinCondition.BLACKHEADS]: "Points noirs",
  [SkinCondition.DARK_SPOTS]: "Taches brunes",
  [SkinCondition.BLACK_DOTS]: "Points noirs",
};
