import { describe, it, expect } from 'vitest';
import {
  calculateNextEligibleDate,
  calculateAge,
  isDemographicallyEligible,
  COOLDOWN_CONFIG
} from '../../src/config/cooldown.js';

describe('Donor Eligibility & Cooldown Rules (NBTC Guidelines - Section 13.4)', () => {
  it('should enforce 90-day cooldown for male donors', () => {
    const lastDonation = new Date('2026-01-01T00:00:00.000Z');
    const nextEligible = calculateNextEligibleDate(lastDonation, 'male');
    const diffDays = Math.round((nextEligible.getTime() - lastDonation.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(COOLDOWN_CONFIG.MALE_COOLDOWN_DAYS);
  });

  it('should enforce 120-day cooldown for female donors', () => {
    const lastDonation = new Date('2026-01-01T00:00:00.000Z');
    const nextEligible = calculateNextEligibleDate(lastDonation, 'female');
    const diffDays = Math.round((nextEligible.getTime() - lastDonation.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(COOLDOWN_CONFIG.FEMALE_COOLDOWN_DAYS);
  });

  it('correctly calculates age in years', () => {
    const ref = new Date('2026-11-21');
    expect(calculateAge(new Date('2006-11-21'), ref)).toBe(20);
    expect(calculateAge(new Date('2006-11-22'), ref)).toBe(19);
    expect(calculateAge(new Date('1970-01-01'), ref)).toBe(56);
  });

  it('validates age and weight demographic eligibility', () => {
    const ref = new Date('2026-11-21');

    // Eligible 25-year old, 65 kg
    const dobValid = new Date('2001-05-15');
    expect(isDemographicallyEligible(dobValid, 65, ref).eligible).toBe(true);

    // Ineligible: under 18
    const dobUnderage = new Date('2010-01-01');
    const underRes = isDemographicallyEligible(dobUnderage, 60, ref);
    expect(underRes.eligible).toBe(false);
    expect(underRes.reason).toContain('outside permitted range');

    // Ineligible: over 65
    const dobOverage = new Date('1950-01-01');
    const overRes = isDemographicallyEligible(dobOverage, 70, ref);
    expect(overRes.eligible).toBe(false);

    // Ineligible: underweight (< 45 kg)
    const weightRes = isDemographicallyEligible(dobValid, 42, ref);
    expect(weightRes.eligible).toBe(false);
    expect(weightRes.reason).toContain('below minimum required');
  });
});
