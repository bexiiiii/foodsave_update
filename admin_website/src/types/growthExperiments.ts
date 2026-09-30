export type GrowthCohort = 'NEVER_CLEAN' | 'ONE_CLEAN_RECENT' | 'ONE_CLEAN_LAPSED' | 'REPEAT_LAPSED';
export type GrowthArm = 'TREATMENT' | 'HOLDOUT';

export interface GrowthExperiment {
  id: string;
  name: string;
  seed: string;
  holdoutBps: number;
  enabled: boolean;
  createdAt: string;
  createdBy: number;
  legacyOrderZone: string;
  measurementZone: string;
}

export interface GrowthAssignmentPreview {
  userId: number;
  cohort: GrowthCohort | null;
  arm: GrowthArm;
  baselineCleanCount: number;
  baselineLastCleanAt: string | null;
  assignedAt: string;
  frozen: boolean;
}

export interface GrowthMeasurement {
  cohort: GrowthCohort;
  arm: GrowthArm;
  asOf: string;
  assignedUsers: number;
  d7MatureUsers: number;
  d7ImmatureUsers: number;
  d7ConvertedUsers: number;
  d7CleanOrders: number;
  d7AnySecondOrNextUsers: number;
  d7DifferentDayRepeatUsers: number;
  d7IttRate: number | null;
  d14MatureUsers: number;
  d14ImmatureUsers: number;
  d14RetainedUsers: number;
  d14RetainedOrders: number;
  d14CancelledOrders: number;
  d14IttRate: number | null;
  d7PickupUsers: number;
  d7PickupOrders: number;
  d14PickupUsers: number;
  d14PickupOrders: number;
}

export interface GrowthDispatchPreview {
  eligible: boolean;
  globalEnabled: boolean;
  experimentEnabled: boolean;
  reasons: string[];
  distanceKm: number | null;
  pickupWindow: {
    id: string;
    productId: number;
    startsAt: string;
    endsAt: string;
    verifiedBy: number;
    verifiedAt: string;
  } | null;
  message: string | null;
}
