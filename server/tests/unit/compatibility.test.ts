import { describe, it, expect } from 'vitest';
import {
  COMPATIBILITY_MATRIX,
  getCompatibleBloodGroups,
  isBloodCompatible
} from '../../src/constants/bloodCompatibility.js';
import { BloodGroup } from '../../src/types/index.js';

describe('Blood Group Compatibility Matrix (Blueprint Section 10)', () => {
  it('O- should only receive from O-', () => {
    expect(getCompatibleBloodGroups('O-')).toEqual(['O-']);
    expect(isBloodCompatible('O-', 'O-')).toBe(true);
    expect(isBloodCompatible('O-', 'O+')).toBe(false);
    expect(isBloodCompatible('O-', 'A+')).toBe(false);
  });

  it('O+ should receive from O- and O+', () => {
    expect(getCompatibleBloodGroups('O+')).toEqual(['O-', 'O+']);
    expect(isBloodCompatible('O+', 'O-')).toBe(true);
    expect(isBloodCompatible('O+', 'O+')).toBe(true);
    expect(isBloodCompatible('O+', 'A+')).toBe(false);
  });

  it('A- should receive from O- and A-', () => {
    expect(getCompatibleBloodGroups('A-')).toEqual(['O-', 'A-']);
    expect(isBloodCompatible('A-', 'A-')).toBe(true);
    expect(isBloodCompatible('A-', 'O-')).toBe(true);
    expect(isBloodCompatible('A-', 'A+')).toBe(false);
  });

  it('A+ should receive from O-, O+, A-, A+', () => {
    expect(getCompatibleBloodGroups('A+')).toEqual(['O-', 'O+', 'A-', 'A+']);
    expect(isBloodCompatible('A+', 'A+')).toBe(true);
    expect(isBloodCompatible('A+', 'O+')).toBe(true);
    expect(isBloodCompatible('A+', 'B+')).toBe(false);
  });

  it('B- should receive from O- and B-', () => {
    expect(getCompatibleBloodGroups('B-')).toEqual(['O-', 'B-']);
    expect(isBloodCompatible('B-', 'B-')).toBe(true);
    expect(isBloodCompatible('B-', 'O-')).toBe(true);
    expect(isBloodCompatible('B-', 'B+')).toBe(false);
  });

  it('B+ should receive from O-, O+, B-, B+', () => {
    expect(getCompatibleBloodGroups('B+')).toEqual(['O-', 'O+', 'B-', 'B+']);
    expect(isBloodCompatible('B+', 'B+')).toBe(true);
    expect(isBloodCompatible('B+', 'O-')).toBe(true);
    expect(isBloodCompatible('B+', 'A+')).toBe(false);
  });

  it('AB- should receive from O-, A-, B-, AB-', () => {
    expect(getCompatibleBloodGroups('AB-')).toEqual(['O-', 'A-', 'B-', 'AB-']);
    expect(isBloodCompatible('AB-', 'AB-')).toBe(true);
    expect(isBloodCompatible('AB-', 'A-')).toBe(true);
    expect(isBloodCompatible('AB-', 'B-')).toBe(true);
    expect(isBloodCompatible('AB-', 'AB+')).toBe(false);
  });

  it('AB+ is the universal recipient: should receive from all 8 blood groups', () => {
    const allGroups: BloodGroup[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
    expect(getCompatibleBloodGroups('AB+')).toEqual(allGroups);
    for (const group of allGroups) {
      expect(isBloodCompatible('AB+', group)).toBe(true);
    }
  });

  it('handles exactMatchOnly option correctly', () => {
    expect(getCompatibleBloodGroups('AB+', true)).toEqual(['AB+']);
    expect(getCompatibleBloodGroups('A+', true)).toEqual(['A+']);
  });
});
