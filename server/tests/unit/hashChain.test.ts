import { describe, it, expect } from 'vitest';
import { canonicalJSON, computeEventHash, GENESIS_HASH } from '../../src/services/audit/hashChain.js';

describe('Append-Only Hash-Chained Audit Log (Blueprint Section 9)', () => {
  it('canonicalJSON produces identical strings regardless of object key order', () => {
    const objA = { z: 1, a: 'test', m: { b: 2, a: 1 } };
    const objB = { a: 'test', m: { a: 1, b: 2 }, z: 1 };

    expect(canonicalJSON(objA)).toBe(canonicalJSON(objB));
    expect(canonicalJSON(objA)).toBe('{"a":"test","m":{"a":1,"b":2},"z":1}');
  });

  it('computes deterministic SHA-256 event hash', () => {
    const event = { type: 'STATE_TRANSITION', to: 'OPEN' };
    const hash1 = computeEventHash(GENESIS_HASH, event);
    const hash2 = computeEventHash(GENESIS_HASH, { to: 'OPEN', type: 'STATE_TRANSITION' });

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex string length
  });

  it('detects tampering if previous hash or payload is modified', () => {
    const event = { type: 'STATE_TRANSITION', to: 'OPEN' };
    const originalHash = computeEventHash(GENESIS_HASH, event);

    // Altered payload
    const tamperedPayloadHash = computeEventHash(GENESIS_HASH, { type: 'STATE_TRANSITION', to: 'REJECTED' });
    expect(tamperedPayloadHash).not.toBe(originalHash);

    // Altered prevHash
    const tamperedPrevHash = computeEventHash('1'.repeat(64), event);
    expect(tamperedPrevHash).not.toBe(originalHash);
  });
});
