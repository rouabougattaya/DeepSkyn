export type AcneSeverity = 'mild' | 'moderate' | 'severe';
export type AcneType = 'whiteheads' | 'cystic' | 'hormonal';
export type AcneLocation = 'forehead' | 'cheeks' | 'chin';

export type WrinkleDepth = 'fine' | 'deep';
export type WrinkleLocation = 'eyes' | 'forehead' | 'mouth';

export type HydrationFeel = 'tight' | 'normal' | 'very-dry';

export type BlackheadsSeverity = 'low' | 'medium' | 'high';
export type BlackheadsLocation = 'nose' | 'chin' | 'cheeks';

export type PoresVisibility = 'low' | 'medium' | 'high';
export type PoresZone = 'tzone' | 'cheeks' | 'all';

export type SensitivityLevel = 'low' | 'medium' | 'high';

export type RednessLevel = 'occasional' | 'persistent' | 'flaring';
export type RednessLocation = 'cheeks' | 'nose' | 'chin';

export interface SkinQuestionnaireData {
  acne: {
    enabled: boolean;
    severity: AcneSeverity | null;
    type: AcneType | null;
    location: AcneLocation[];
  };
  blackheads: {
    enabled: boolean;
    severity: BlackheadsSeverity | null;
    location: BlackheadsLocation[];
  };
  wrinkles: {
    enabled: boolean;
    depth: WrinkleDepth | null;
    location: WrinkleLocation[];
  };
  pores: {
    enabled: boolean;
    visibility: PoresVisibility | null;
    zone: PoresZone | null;
  };
  hydration: {
    enabled: boolean;
    feel: HydrationFeel | null;
  };
  sensitivity: {
    enabled: boolean;
    level: SensitivityLevel | null;
  };
  redness: {
    enabled: boolean;
    level: RednessLevel | null;
    location: RednessLocation[];
  };
}

export const DEFAULT_QUESTIONNAIRE: SkinQuestionnaireData = {
  acne: { enabled: false, severity: null, type: null, location: [] },
  blackheads: { enabled: false, severity: null, location: [] },
  wrinkles: { enabled: false, depth: null, location: [] },
  pores: { enabled: false, visibility: null, zone: null },
  hydration: { enabled: false, feel: null },
  sensitivity: { enabled: false, level: null },
  redness: { enabled: false, level: null, location: [] },
};
