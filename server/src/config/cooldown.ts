import { Gender } from '../types/index.js';

/**
 * Cooldown & Legal Guidelines (National Blood Transfusion Council - NBTC India)
 * Blueprint Section 13.4
 */
export const COOLDOWN_CONFIG = {
  // Whole-blood donation intervals
  MALE_COOLDOWN_DAYS: 90,   // ~3 months
  FEMALE_COOLDOWN_DAYS: 120, // ~4 months
  OTHER_COOLDOWN_DAYS: 90,

  // Demographic bounds
  MIN_DONOR_AGE: 18,
  MAX_DONOR_AGE: 65,
  MIN_WEIGHT_KG: 45,

  // Fatigue protection (Section 12.1): exclude if notified in last 24h
  FATIGUE_LIMIT_HOURS: 24
};

/**
 * Calculate the next eligible donation date based on last donation and gender
 */
export function calculateNextEligibleDate(lastDonationAt: Date, gender: Gender): Date {
  const nextDate = new Date(lastDonationAt.getTime());
  const days =
    gender === 'female'
      ? COOLDOWN_CONFIG.FEMALE_COOLDOWN_DAYS
      : COOLDOWN_CONFIG.MALE_COOLDOWN_DAYS;

  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

/**
 * Calculate age in completed years from Date of Birth
 */
export function calculateAge(dob: Date, referenceDate = new Date()): number {
  let age = referenceDate.getFullYear() - dob.getFullYear();
  const m = referenceDate.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Basic self-declared demographic screening
 */
export function isDemographicallyEligible(
  dob: Date,
  weightKg?: number,
  referenceDate = new Date()
): { eligible: boolean; reason?: string } {
  const age = calculateAge(dob, referenceDate);
  if (age < COOLDOWN_CONFIG.MIN_DONOR_AGE || age > COOLDOWN_CONFIG.MAX_DONOR_AGE) {
    return {
      eligible: false,
      reason: `Age ${age} outside permitted range (${COOLDOWN_CONFIG.MIN_DONOR_AGE}-${COOLDOWN_CONFIG.MAX_DONOR_AGE})`
    };
  }

  if (weightKg !== undefined && weightKg < COOLDOWN_CONFIG.MIN_WEIGHT_KG) {
    return {
      eligible: false,
      reason: `Weight ${weightKg} kg below minimum required (${COOLDOWN_CONFIG.MIN_WEIGHT_KG} kg)`
    };
  }

  return { eligible: true };
}
