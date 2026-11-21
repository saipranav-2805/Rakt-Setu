import { UrgencyLevel } from '../types/index.js';

export interface WaveConfig {
  waveNumber: number;
  radiusKm: number;
  maxDonorsToNotify: number;
  waitMinutesCritical: number;
  waitMinutesUrgent: number;
}

/**
 * Standard Escalation Waves based on Section 12.3 of the Blueprint
 */
export const WAVE_SCHEDULE: readonly WaveConfig[] = [
  { waveNumber: 1, radiusKm: 5,  maxDonorsToNotify: 10, waitMinutesCritical: 10, waitMinutesUrgent: 20 },
  { waveNumber: 2, radiusKm: 15, maxDonorsToNotify: 20, waitMinutesCritical: 10, waitMinutesUrgent: 20 },
  { waveNumber: 3, radiusKm: 30, maxDonorsToNotify: 30, waitMinutesCritical: 15, waitMinutesUrgent: 30 },
  { waveNumber: 4, radiusKm: 50, maxDonorsToNotify: 40, waitMinutesCritical: 0,  waitMinutesUrgent: 0  } // Until expiry
] as const;

export function getWaveDelayMs(
  waveNumber: number,
  urgency: UrgencyLevel,
  demoMode = false,
  fastForwardSeconds = 30
): number {
  if (demoMode) {
    return fastForwardSeconds * 1000;
  }

  const wave = WAVE_SCHEDULE.find((w) => w.waveNumber === waveNumber);
  if (!wave) return 0;

  const minutes = urgency === 'critical' ? wave.waitMinutesCritical : wave.waitMinutesUrgent;
  return minutes * 60 * 1000;
}
