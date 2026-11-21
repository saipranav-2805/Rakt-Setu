/**
 * Configurable Ranking Weights
 * Blueprint Section 12.2:
 * score = 0.40 * proximityScore
 *       + 0.25 * responseScore
 *       + 0.15 * exactMatchBonus
 *       + 0.10 * recencyOfActivity
 *       + 0.10 * fatigueInverse
 */
export interface RankingWeights {
  proximity: number;
  response: number;
  exactMatch: number;
  recency: number;
  fatigue: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  proximity: 0.40,
  response: 0.25,
  exactMatch: 0.15,
  recency: 0.10,
  fatigue: 0.10
};

export const OVER_NOTIFICATION_MULTIPLIER = 4; // Between 3 and 5 times (Section 12.4)
