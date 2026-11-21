import { Worker, Job } from 'bullmq';
import { redisConnection, matchingQueue, notificationQueue } from './queues.js';
import { RequestModel } from '../../models/Request.js';
import { NotificationModel } from '../../models/Notification.js';
import { findEligibleCandidates } from '../matching/candidateQuery.js';
import { rankCandidates, DonorRankingInput } from '../matching/ranking.js';
import { WAVE_SCHEDULE, getWaveDelayMs } from '../../constants/waves.js';
import { TERMINAL_STATES } from '../../constants/requestStates.js';
import { OVER_NOTIFICATION_MULTIPLIER } from '../../config/ranking.js';
import { sseManager } from '../sse/sseManager.js';
import { appendAuditEvent } from '../audit/hashChain.js';

export interface WaveJobData {
  requestId: string;
  waveNumber: number;
}

/**
 * Wave Escalation Worker
 * Consumes the matching queue and drives automated widening of radius
 * Strictly adheres to Blueprint Section 12.3 & 13.3
 */
export const waveWorker = new Worker<WaveJobData>(
  'matching',
  async (job: Job<WaveJobData>) => {
    const { requestId, waveNumber } = job.data;
    console.log(`[WaveWorker] Processing Wave ${waveNumber} for Request ${requestId}`);

    // 1. Re-read request to ensure freshness
    const request = await RequestModel.findById(requestId);
    if (!request) {
      console.warn(`[WaveWorker] Request ${requestId} not found. Aborting job.`);
      return;
    }

    // 2. Check if request is fulfilled or in a terminal state
    if (request.unitsConfirmed >= request.unitsNeeded || TERMINAL_STATES.includes(request.state)) {
      console.log(`[WaveWorker] Request ${requestId} already filled or in terminal state (${request.state}). Exiting.`);
      return;
    }

    const currentWaveConfig = WAVE_SCHEDULE.find((w) => w.waveNumber === waveNumber);
    if (!currentWaveConfig) {
      console.error(`[WaveWorker] Invalid wave number ${waveNumber} for request ${requestId}`);
      return;
    }

    // 3. Update current wave state on request
    request.currentWave = waveNumber;
    request.radiusKm = currentWaveConfig.radiusKm;
    if (request.state === 'OPEN') {
      request.state = 'MATCHING';
    }
    await request.save();

    // 4. Query eligible candidates within current wave radius
    const candidates = await findEligibleCandidates({
      hospitalLocation: request.hospital.location,
      compatibleGroups: request.compatibleGroups,
      radiusKm: currentWaveConfig.radiusKm,
      requestId: request._id
    });

    console.log(`[WaveWorker] Found ${candidates.length} eligible candidates in radius ${currentWaveConfig.radiusKm} km`);

    if (candidates.length > 0) {
      // 5. Transform and rank candidates using 5-factor scoring algorithm
      const rankingInputs: DonorRankingInput[] = candidates.map((c) => ({
        donorId: (c.donor._id as any).toString(),
        distanceKm: c.distanceKm,
        radiusKm: currentWaveConfig.radiusKm,
        donorBloodGroup: c.donor.bloodGroup,
        patientBloodGroup: request.patient.bloodGroup,
        stats: c.donor.stats,
        lastActiveAt: c.donor.lastDonationAt
      }));

      const ranked = rankCandidates(rankingInputs);

      // 6. Calculate batch size using over-notification multiplier (3x - 5x units needed)
      const unitsRemaining = request.unitsNeeded - request.unitsConfirmed;
      const targetBatchSize = Math.min(
        currentWaveConfig.maxDonorsToNotify,
        unitsRemaining * OVER_NOTIFICATION_MULTIPLIER
      );

      const selectedDonors = ranked.slice(0, targetBatchSize);

      // 7. Insert notification records and queue send jobs
      for (const donorScore of selectedDonors) {
        const candidateMatch = candidates.find((c) => (c.donor._id as any).toString() === donorScore.donorId);
        if (!candidateMatch) continue;

        try {
          const notif = await NotificationModel.create({
            requestId: request._id,
            donorId: candidateMatch.donor._id,
            wave: waveNumber,
            channel: 'whatsapp',
            status: 'QUEUED'
          });

          await notificationQueue.add(
            `notify:${request._id}:${candidateMatch.donor._id}`,
            {
              notificationId: notif._id.toString(),
              requestId: request._id.toString(),
              donorId: candidateMatch.donor._id.toString(),
              distanceKm: candidateMatch.distanceKm
            }
          );
        } catch (err: any) {
          // If already queued or unique constraint hits, continue safely
          console.warn(`[WaveWorker] Skipping donor ${donorScore.donorId}: ${err.message}`);
        }
      }

      // 8. Broadcast wave update via SSE to requester's live dashboard
      sseManager.broadcastToRequest(request._id.toString(), {
        type: 'WAVE_ADVANCED',
        payload: {
          wave: waveNumber,
          radiusKm: currentWaveConfig.radiusKm,
          donorsNotifiedInWave: selectedDonors.length,
          totalUnitsConfirmed: request.unitsConfirmed,
          unitsNeeded: request.unitsNeeded
        }
      });

      // 9. Hash-chained audit event
      await appendAuditEvent({
        requestId: request._id,
        actor: 'SYSTEM_WAVE_SCHEDULER',
        type: 'WAVE_DISPATCHED',
        payload: {
          waveNumber,
          radiusKm: currentWaveConfig.radiusKm,
          notifiedCount: selectedDonors.length
        }
      });
    }

    // 10. Schedule next wave if there is a subsequent wave in the schedule
    const nextWaveConfig = WAVE_SCHEDULE.find((w) => w.waveNumber === waveNumber + 1);
    if (nextWaveConfig) {
      const isDemoMode = process.env.DEMO_MODE === 'true';
      const delayMs = getWaveDelayMs(waveNumber, request.urgency, isDemoMode);

      const nextJobId = `wave:${request._id}:${waveNumber + 1}`;
      console.log(`[WaveWorker] Scheduling next wave (Wave ${waveNumber + 1}) in ${delayMs / 1000}s with Job ID: ${nextJobId}`);

      await matchingQueue.add(
        'processWave',
        { requestId: request._id.toString(), waveNumber: waveNumber + 1 },
        { delay: delayMs, jobId: nextJobId }
      );
    }
  },
  { connection: redisConnection, concurrency: 5 }
);
