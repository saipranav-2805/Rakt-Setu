import { describe, it, expect } from 'vitest';
import { calculateDonorScore, rankCandidates, DonorRankingInput } from '../../src/services/matching/ranking.js';

describe('Donor Multi-Factor Ranking Engine (Blueprint Section 12.2)', () => {
  const refDate = new Date('2026-11-21T12:00:00.000Z');

  it('accurately computes proximity, response, exact match, recency, and fatigue', () => {
    const donor: DonorRankingInput = {
      donorId: 'donor-1',
      distanceKm: 0, // perfect proximity (score = 1.0)
      radiusKm: 10,
      donorBloodGroup: 'O+',
      patientBloodGroup: 'O+', // exact match (bonus = 1.0)
      stats: {
        notified: 10,
        accepted: 10, // perfect response (score = 1.0)
        declined: 0,
        noResponse: 0,
        donated: 5
      },
      lastActiveAt: new Date('2026-11-10T12:00:00.000Z'), // within 30 days (score = 1.0)
      notificationsLast14Days: 0 // no fatigue (score = 1.0)
    };

    const result = calculateDonorScore(donor, undefined, refDate);
    // 0.40(1) + 0.25(1) + 0.15(1) + 0.10(1) + 0.10(1) = 1.00
    expect(result.score).toBe(1.0);
    expect(result.breakdown.proximityScore).toBe(1.0);
    expect(result.breakdown.responseScore).toBe(1.0);
    expect(result.breakdown.exactMatchBonus).toBe(1.0);
    expect(result.breakdown.recencyOfActivity).toBe(1.0);
    expect(result.breakdown.fatigueInverse).toBe(1.0);
  });

  it('ranks closer and exact-match donors above distant compatible-only donors', () => {
    const donorA: DonorRankingInput = {
      donorId: 'donor-close-exact',
      distanceKm: 1,
      radiusKm: 15,
      donorBloodGroup: 'B+',
      patientBloodGroup: 'B+',
      stats: { notified: 5, accepted: 4, declined: 1, noResponse: 0, donated: 2 },
      lastActiveAt: new Date('2026-11-01'),
      notificationsLast14Days: 0
    };

    const donorB: DonorRankingInput = {
      donorId: 'donor-far-compatible',
      distanceKm: 14,
      radiusKm: 15,
      donorBloodGroup: 'O-', // compatible but not exact
      patientBloodGroup: 'B+',
      stats: { notified: 10, accepted: 5, declined: 5, noResponse: 0, donated: 1 },
      lastActiveAt: new Date('2026-08-01'),
      notificationsLast14Days: 3
    };

    const ranked = rankCandidates([donorB, donorA], undefined, refDate);
    expect(ranked[0].donorId).toBe('donor-close-exact');
    expect(ranked[1].donorId).toBe('donor-far-compatible');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });
});
