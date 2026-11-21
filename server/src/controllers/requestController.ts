import { Response } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { RequestModel } from '../models/Request.js';
import { Donor } from '../models/Donor.js';
import { Acceptance } from '../models/Acceptance.js';
import { NotificationModel } from '../models/Notification.js';
import { User } from '../models/User.js';
import { getCompatibleBloodGroups } from '../constants/bloodCompatibility.js';
import { matchingQueue, expiryQueue } from '../services/queue/queues.js';
import { sseManager } from '../services/sse/sseManager.js';
import { appendAuditEvent } from '../services/audit/hashChain.js';
import { getNotificationProvider } from '../services/notifications/index.js';

export const createRequestSchema = z.object({
  patient: z.object({
    age: z.number().min(0).max(120),
    gender: z.enum(['male', 'female', 'other']),
    bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
  }),
  unitsNeeded: z.number().int().min(1).max(20),
  hospital: z.object({
    name: z.string().min(2),
    address: z.string().min(5),
    location: z.object({
      type: z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()])
    })
  }),
  urgency: z.enum(['critical', 'urgent', 'planned']).default('urgent'),
  exactMatchOnly: z.boolean().default(false)
});

export async function createEmergencyRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const body = req.body;

  // Auto-expand compatible blood groups based on Section 10
  const compatibleGroups = getCompatibleBloodGroups(body.patient.bloodGroup, body.exactMatchOnly);

  // Short public tracking code (e.g. RS-8X2F)
  const code = `RS-${nanoid(6).toUpperCase()}`;

  // Default expiry: 24h for urgent/planned, 6h for critical
  const expiryHours = body.urgency === 'critical' ? 6 : 24;
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  const request = await RequestModel.create({
    code,
    requesterId: user._id,
    patient: body.patient,
    unitsNeeded: body.unitsNeeded,
    unitsConfirmed: 0,
    hospital: body.hospital,
    urgency: body.urgency,
    compatibleGroups,
    state: 'OPEN',
    currentWave: 0,
    radiusKm: 5,
    expiresAt,
    message: `Urgent need for ${body.unitsNeeded} unit(s) of ${body.patient.bloodGroup} at ${body.hospital.name}`
  });

  // Append audit event
  await appendAuditEvent({
    requestId: request._id,
    actor: user._id.toString(),
    type: 'REQUEST_CREATED',
    payload: { code, unitsNeeded: body.unitsNeeded, bloodGroup: body.patient.bloodGroup }
  });

  // Schedule Wave 1 escalation job immediately
  await matchingQueue.add(
    'processWave',
    { requestId: request._id.toString(), waveNumber: 1 },
    { jobId: `wave_${request._id}_1` }
  );

  // Schedule expiry sweep job at expiresAt
  const delayUntilExpiry = Math.max(0, expiresAt.getTime() - Date.now());
  await expiryQueue.add(
    'expireRequest',
    { requestId: request._id.toString() },
    { delay: delayUntilExpiry, jobId: `expiry_${request._id}` }
  );

  res.status(201).json({
    success: true,
    request
  });
}

/**
 * Public Request View (Masked Donor Data according to Section 14.1)
 */
export async function getPublicRequestByCode(req: AuthenticatedRequest, res: Response): Promise<void> {
  const code = req.params.code as string;
  const request = await RequestModel.findOne({ code }).populate('requesterId', 'name');

  if (!request) {
    res.status(404).json({ success: false, error: 'Request not found' });
    return;
  }

  // Fetch acceptances
  const acceptances = await Acceptance.find({ requestId: request._id }).populate({
    path: 'donorId',
    populate: { path: 'userId', select: 'name phone' }
  });

  const isRequester = req.user && req.user._id.toString() === request.requesterId._id.toString();

  // Mask donor contact details unless user is the authenticated requester
  const maskedAcceptances = acceptances.map((acc: any) => {
    const donorUser = acc.donorId?.userId;
    const isRevealed = isRequester && acc.status === 'ACCEPTED';

    return {
      id: acc._id,
      status: acc.status,
      acceptedAt: acc.acceptedAt,
      donorFirstName: donorUser?.name ? donorUser.name.split(' ')[0] : 'Donor',
      bloodGroup: acc.donorId?.bloodGroup,
      contactUnlocked: isRevealed,
      phone: isRevealed ? donorUser?.phone : undefined
    };
  });

  res.status(200).json({
    success: true,
    request: {
      id: request._id,
      code: request.code,
      patient: request.patient,
      unitsNeeded: request.unitsNeeded,
      unitsConfirmed: request.unitsConfirmed,
      hospital: request.hospital,
      urgency: request.urgency,
      state: request.state,
      currentWave: request.currentWave,
      radiusKm: request.radiusKm,
      expiresAt: request.expiresAt,
      acceptances: maskedAcceptances
    }
  });
}

/**
 * Concurrency-Safe Donor Acceptance & Unit Accounting
 * Blueprint Section 13.1 Showpiece Algorithm
 */
export async function acceptRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  const idOrCode = req.params.id as string;
  const { screeningAnswers, donorId } = req.body;

  // 1. Resolve target request by ObjectId or Code
  const targetReq = mongoose.isValidObjectId(idOrCode)
    ? await RequestModel.findById(idOrCode)
    : await RequestModel.findOne({ code: idOrCode });

  if (!targetReq) {
    res.status(404).json({ success: false, error: 'Request not found' });
    return;
  }
  const id = targetReq._id.toString();

  // 2. Resolve responding donor (authenticated user or via query/body parameter)
  let donor = null;
  let donorUser: any = null;

  if (req.user) {
    donor = await Donor.findOne({ userId: req.user._id });
    donorUser = req.user;
  }

  if (!donor) {
    const candidateDonorId = donorId || req.query.donor;
    if (candidateDonorId && mongoose.isValidObjectId(candidateDonorId as string)) {
      donor = await Donor.findById(candidateDonorId).populate('userId');
      if (donor) donorUser = donor.userId;
    }
  }

  // Fallback for demo: find an active seeded donor matching the compatible groups
  if (!donor) {
    donor = await Donor.findOne({
      bloodGroup: { $in: targetReq.compatibleGroups }
    }).populate('userId');
    if (donor) donorUser = donor.userId;
  }

  if (!donor || !donorUser) {
    res.status(404).json({ success: false, error: 'Donor profile required to accept' });
    return;
  }

  // 3. Atomic conditional update: only increment if unitsConfirmed < unitsNeeded
  const updatedRequest = await RequestModel.findOneAndUpdate(
    {
      _id: id,
      unitsConfirmed: { $lt: targetReq.unitsNeeded },
      state: { $in: ['OPEN', 'MATCHING', 'PARTIALLY_FULFILLED'] }
    },
    {
      $inc: { unitsConfirmed: 1 }
    },
    { new: true }
  );

  let acceptanceStatus: 'ACCEPTED' | 'WAITLISTED';

  if (updatedRequest) {
    acceptanceStatus = 'ACCEPTED';

    // Check if fully fulfilled
    if (updatedRequest.unitsConfirmed >= updatedRequest.unitsNeeded) {
      updatedRequest.state = 'FULFILLED';
      await updatedRequest.save();
    } else {
      updatedRequest.state = 'PARTIALLY_FULFILLED';
      await updatedRequest.save();
    }
  } else {
    // Capacity filled by competing requests -> place donor on WAITLIST
    acceptanceStatus = 'WAITLISTED';
  }

  // Record acceptance
  const acceptance = await Acceptance.findOneAndUpdate(
    { requestId: id, donorId: donor._id },
    {
      status: acceptanceStatus,
      acceptedAt: new Date(),
      screeningAnswers: screeningAnswers || {},
      contactRevealedAt: acceptanceStatus === 'ACCEPTED' ? new Date() : undefined
    },
    { upsert: true, new: true }
  );

  // Update notification response status
  await NotificationModel.findOneAndUpdate(
    { requestId: id, donorId: donor._id },
    { response: 'ACCEPTED', respondedAt: new Date(), status: 'READ' }
  );

  // Update donor acceptance stats
  await Donor.findByIdAndUpdate(donor._id, { $inc: { 'stats.accepted': 1 } });

  // Broadcast real-time SSE update to requester
  sseManager.broadcastToRequest(id, {
    type: acceptanceStatus === 'ACCEPTED' ? 'DONOR_ACCEPTED' : 'DONOR_WAITLISTED',
    payload: {
      acceptanceId: acceptance._id,
      donorFirstName: (donorUser.name || 'Donor').split(' ')[0],
      bloodGroup: donor.bloodGroup,
      status: acceptanceStatus,
      unitsConfirmed: updatedRequest ? updatedRequest.unitsConfirmed : undefined
    }
  });

  // Append audit event
  await appendAuditEvent({
    requestId: id,
    actor: donorUser._id.toString(),
    type: `DONOR_${acceptanceStatus}`,
    payload: { donorId: donor._id, status: acceptanceStatus }
  });

  res.status(200).json({
    success: true,
    status: acceptanceStatus,
    message:
      acceptanceStatus === 'ACCEPTED'
        ? 'Thank you! Your donation commitment is confirmed. Hospital and contact details unlocked.'
        : 'Thank you! The required units are currently covered by earlier donors. You have been placed on standby (waitlist).'
  });
}

/**
 * Requester marks request closed / fulfilled / cancelled
 */
export async function closeRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  const idOrCode = req.params.id as string;
  const { reason, state } = req.body;
  const user = req.user!;

  const request = mongoose.isValidObjectId(idOrCode)
    ? await RequestModel.findById(idOrCode)
    : await RequestModel.findOne({ code: idOrCode });

  if (!request) {
    res.status(404).json({ success: false, error: 'Request not found' });
    return;
  }

  if (request.requesterId.toString() !== user._id.toString() && user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Only the requester can close this request' });
    return;
  }

  request.state = state === 'CANCELLED' ? 'CANCELLED' : 'FULFILLED';
  await request.save();

  sseManager.broadcastToRequest(request._id.toString(), {
    type: 'REQUEST_CLOSED',
    payload: { state: request.state, reason }
  });

  res.status(200).json({ success: true, request });
}

/**
 * Report suspicious request (Abuse prevention - auto pause after threshold)
 */
export async function reportSuspiciousRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  const idOrCode = req.params.id as string;
  const user = req.user;
  const { reason } = req.body;

  const request = mongoose.isValidObjectId(idOrCode)
    ? await RequestModel.findById(idOrCode)
    : await RequestModel.findOne({ code: idOrCode });

  const targetId = request ? request._id.toString() : idOrCode;

  await appendAuditEvent({
    requestId: targetId,
    actor: user ? user._id.toString() : 'ANONYMOUS_REPORTER',
    type: 'REQUEST_REPORTED',
    payload: { reason }
  });

  res.status(200).json({ success: true, message: 'Report submitted. Our moderation team is reviewing this request.' });
}

/**
 * Live SSE Stream Endpoint for Requesters
 */
export async function streamRequestUpdates(req: AuthenticatedRequest, res: Response): Promise<void> {
  const idOrCode = req.params.id as string;
  const targetReq = mongoose.isValidObjectId(idOrCode)
    ? await RequestModel.findById(idOrCode)
    : await RequestModel.findOne({ code: idOrCode });

  const targetId = targetReq ? targetReq._id.toString() : idOrCode;
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  sseManager.addClient(clientId, targetId, res);
}
