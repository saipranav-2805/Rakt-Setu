import { RequestState } from '../types/index.js';

export const REQUEST_STATES: Record<RequestState, RequestState> = {
  DRAFT: 'DRAFT',
  VERIFYING: 'VERIFYING',
  OPEN: 'OPEN',
  MATCHING: 'MATCHING',
  PARTIALLY_FULFILLED: 'PARTIALLY_FULFILLED',
  FULFILLED: 'FULFILLED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED'
};

export const TERMINAL_STATES: readonly RequestState[] = [
  'FULFILLED',
  'EXPIRED',
  'CANCELLED',
  'REJECTED'
] as const;

export const ACTIVE_STATES: readonly RequestState[] = [
  'DRAFT',
  'VERIFYING',
  'OPEN',
  'MATCHING',
  'PARTIALLY_FULFILLED'
] as const;

/**
 * Valid state transitions mapping
 * Based strictly on Section 11 of the Blueprint
 */
export const ALLOWED_TRANSITIONS: Record<RequestState, readonly RequestState[]> = {
  DRAFT: ['VERIFYING', 'CANCELLED', 'REJECTED'],
  VERIFYING: ['OPEN', 'CANCELLED', 'REJECTED'],
  OPEN: ['MATCHING', 'CANCELLED', 'REJECTED'],
  MATCHING: ['PARTIALLY_FULFILLED', 'FULFILLED', 'EXPIRED', 'CANCELLED', 'REJECTED'],
  PARTIALLY_FULFILLED: ['FULFILLED', 'EXPIRED', 'CANCELLED', 'REJECTED'],
  FULFILLED: [], // Terminal
  EXPIRED: [],   // Terminal
  CANCELLED: [], // Terminal
  REJECTED: []   // Terminal
};
