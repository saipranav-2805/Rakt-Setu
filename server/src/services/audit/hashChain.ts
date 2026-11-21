import crypto from 'node:crypto';
import { AuditEvent, IAuditEvent } from '../../models/AuditEvent.js';

/**
 * Deterministic JSON stringifier (canonical JSON with sorted keys)
 * Ensures consistent hash generation across different runtimes and key orders
 */
export function canonicalJSON(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalJSON(item)).join(',')}]`;
  }

  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((key) => `${JSON.stringify(key)}:${canonicalJSON(obj[key])}`);
  return `{${pairs.join(',')}}`;
}

/**
 * Computes SHA-256 hash from prevHash and canonicalJSON representation of the event
 */
export function computeEventHash(prevHash: string, eventData: Record<string, any>): string {
  const content = prevHash + canonicalJSON(eventData);
  return crypto.createHash('sha256').update(content).digest('hex');
}

export const GENESIS_HASH = '0'.repeat(64);

/**
 * Append a tamper-evident hash-chained audit event
 * Based on Section 9 & 13.1 of the Blueprint
 */
export async function appendAuditEvent(params: {
  requestId?: any;
  actor: string;
  type: string;
  payload: Record<string, any>;
}): Promise<IAuditEvent> {
  // Get the most recent audit event to chain from
  const lastEvent = await AuditEvent.findOne().sort({ createdAt: -1, _id: -1 }).exec();
  const prevHash = lastEvent ? lastEvent.hash : GENESIS_HASH;

  const eventData = {
    requestId: params.requestId ? String(params.requestId) : null,
    actor: params.actor,
    type: params.type,
    payload: params.payload
  };

  const hash = computeEventHash(prevHash, eventData);

  const auditRecord = new AuditEvent({
    requestId: params.requestId,
    actor: params.actor,
    type: params.type,
    payload: params.payload,
    prevHash,
    hash
  });

  return await auditRecord.save();
}

/**
 * Verify integrity of the audit chain
 */
export async function verifyAuditChain(): Promise<{ valid: boolean; brokenAtId?: string }> {
  const events = await AuditEvent.find().sort({ createdAt: 1, _id: 1 }).exec();
  let expectedPrevHash = GENESIS_HASH;

  for (const event of events) {
    if (event.prevHash !== expectedPrevHash) {
      return { valid: false, brokenAtId: String(event._id) };
    }

    const eventData = {
      requestId: event.requestId ? String(event.requestId) : null,
      actor: event.actor,
      type: event.type,
      payload: event.payload
    };

    const calculatedHash = computeEventHash(event.prevHash, eventData);
    if (calculatedHash !== event.hash) {
      return { valid: false, brokenAtId: String(event._id) };
    }

    expectedPrevHash = event.hash;
  }

  return { valid: true };
}
