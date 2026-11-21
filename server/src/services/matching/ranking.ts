import { BloodGroup } from '../../types/index.js';
import { RankingWeights, DEFAULT_RANKING_WEIGHTS } from '../../config/ranking.js';

export interface DonorRankingInput {
  donorId: string;
  distanceKm: number;
  radiusKm: number;
  donorBloodGroup: BloodGroup;
  patientBloodGroup: BloodGroup;
  stats: {
    notified: number;
    accepted: number;
    declined: number;
    noResponse: number;
    donated: number;
  };
  lastActiveAt?: Date;
  notificationsLast14Days?: number;
}

export interface RankedDonorResult {
  donorId: string;
  score: number;
  breakdown: {
    proximityScore: number;
    responseScore: number;
    exactMatchBonus: number;
    recencyOfActivity: number;
    fatigueInverse: number;
  };
}

/**
 * Calculate multi-factor ranking score
 * Strictly follows Section 12.2 of RaktSetu Blueprint:
 * score = 0.40 * proximityScore
 *       + 0.25 * responseScore
 *       + 0.15 * exactMatchBonus
 *       + 0.10 * recencyOfActivity
 *       + 0.10 * fatigueInverse
 */
export function calculateDonorScore(
  input: DonorRankingInput,
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS,
  referenceDate = new Date()
): RankedDonorResult {
  // 1. Proximity score: closer is better, normalised 0..1
  // If distance >= radiusKm, score is 0. If distance is 0, score is 1.
  const proximityScore = Math.max(0, Math.min(1, 1 - input.distanceKm / Math.max(input.radiusKm, 1)));

  // 2. Response score: historical accept / notified ratio
  let responseScore: number;
  if (!input.stats || input.stats.notified === 0) {
    // Generous default for new registered willing donors
    responseScore = 0.8;
  } else {
    responseScore = Math.min(1, input.stats.accepted / input.stats.notified);
  }

  // 3. Exact match bonus: 1 if donor has the identical blood group, 0 if compatible-only
  const exactMatchBonus = input.donorBloodGroup === input.patientBloodGroup ? 1.0 : 0.0;

  // 4. Recency of activity: active in the last 30 days
  let recencyOfActivity = 0.5; // Default moderate
  if (input.lastActiveAt) {
    const diffDays = (referenceDate.getTime() - input.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 30) {
      recencyOfActivity = 1.0;
    } else if (diffDays <= 90) {
      recencyOfActivity = 0.7;
    } else {
      recencyOfActivity = 0.3;
    }
  }

  // 5. Fatigue inverse: fewer recent notifications received -> higher score
  const recentNotifs = input.notificationsLast14Days || 0;
  // If 0 notifications: 1.0, 1 notification: 0.8, 2 notifications: 0.5, 3+: 0.2
  let fatigueInverse: number;
  if (recentNotifs === 0) {
    fatigueInverse = 1.0;
  } else if (recentNotifs === 1) {
    fatigueInverse = 0.75;
  } else if (recentNotifs === 2) {
    fatigueInverse = 0.5;
  } else {
    fatigueInverse = 0.2;
  }

  const score =
    weights.proximity * proximityScore +
    weights.response * responseScore +
    weights.exactMatch * exactMatchBonus +
    weights.recency * recencyOfActivity +
    weights.fatigue * fatigueInverse;

  return {
    donorId: input.donorId,
    score: Number(score.toFixed(4)),
    breakdown: {
      proximityScore: Number(proximityScore.toFixed(4)),
      responseScore: Number(responseScore.toFixed(4)),
      exactMatchBonus,
      recencyOfActivity,
      fatigueInverse
    }
  };
}

/**
 * Rank an array of candidate donors in descending order of score
 */
export function rankCandidates(
  candidates: DonorRankingInput[],
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS,
  referenceDate = new Date()
): RankedDonorResult[] {
  return candidates
    .map((c) => calculateDonorScore(c, weights, referenceDate))
    .sort((a, b) => b.score - a.score);
}
