import { ClientSession } from 'mongoose';
import { IRequest, RequestModel } from '../../models/Request.js';
import { RequestState } from '../../types/index.js';
import { ALLOWED_TRANSITIONS, TERMINAL_STATES } from '../../constants/requestStates.js';
import { appendAuditEvent } from '../audit/hashChain.js';

export interface TransitionResult {
  success: boolean;
  request?: IRequest;
  error?: string;
}

/**
 * Single state transition engine
 * Strictly implements Section 11 of RaktSetu Blueprint:
 * - Transitions are performed only by a single transition(request, event) function
 * - Validates allowed moves
 * - Written with an optimistic version check
 * - Appends a hash-chained audit event
 * - Terminal states cannot be left
 */
export async function transitionRequestState(params: {
  requestId: string;
  targetState: RequestState;
  actor: string;
  reason?: string;
  extraUpdates?: Record<string, any>;
  session?: ClientSession;
}): Promise<TransitionResult> {
  const { requestId, targetState, actor, reason, extraUpdates = {}, session } = params;

  // 1. Fetch current request state
  const currentRequest = await RequestModel.findById(requestId).session(session || null);
  if (!currentRequest) {
    return { success: false, error: `Request with id ${requestId} not found` };
  }

  // 2. Terminal state check: terminal states cannot be left
  if (TERMINAL_STATES.includes(currentRequest.state)) {
    return {
      success: false,
      error: `Cannot transition from terminal state ${currentRequest.state}`
    };
  }

  // 3. Validate transition legality
  const validTargets = ALLOWED_TRANSITIONS[currentRequest.state] || [];
  if (!validTargets.includes(targetState)) {
    return {
      success: false,
      error: `Illegal state transition from ${currentRequest.state} to ${targetState}`
    };
  }

  // 4. Atomic conditional update with optimistic concurrency control (version match)
  const currentVersion = currentRequest.version;
  const updatePayload = {
    ...extraUpdates,
    state: targetState,
    $inc: { version: 1 }
  };

  const updatedRequest = await RequestModel.findOneAndUpdate(
    { _id: requestId, version: currentVersion },
    updatePayload,
    { new: true, session: session || null }
  );

  if (!updatedRequest) {
    return {
      success: false,
      error: `Optimistic concurrency conflict: Request ${requestId} was modified by another transaction`
    };
  }

  // 5. Append append-only hash-chained audit event
  await appendAuditEvent({
    requestId: updatedRequest._id,
    actor,
    type: `REQUEST_STATE_TRANSITION`,
    payload: {
      fromState: currentRequest.state,
      toState: targetState,
      version: updatedRequest.version,
      reason: reason || null,
      unitsConfirmed: updatedRequest.unitsConfirmed,
      unitsNeeded: updatedRequest.unitsNeeded
    }
  });

  return {
    success: true,
    request: updatedRequest
  };
}
