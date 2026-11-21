import { BloodGroup } from '../types/index.js';

/**
 * Pure lookup table for red cell and whole blood compatibility
 * Based strictly on Section 10 of RaktSetu Blueprint
 */
export const COMPATIBILITY_MATRIX: Record<BloodGroup, readonly BloodGroup[]> = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
} as const;

export const ALL_BLOOD_GROUPS: readonly BloodGroup[] = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
] as const;

/**
 * Returns compatible donor groups for a given patient blood group.
 * @param patientGroup Patient's blood group
 * @param exactMatchOnly If true, returns only the patient's exact blood group
 */
export function getCompatibleBloodGroups(
  patientGroup: BloodGroup,
  exactMatchOnly = false
): BloodGroup[] {
  if (exactMatchOnly) {
    return [patientGroup];
  }
  return [...COMPATIBILITY_MATRIX[patientGroup]];
}

/**
 * Checks whether a donor blood group can donate to a patient blood group.
 */
export function isBloodCompatible(patientGroup: BloodGroup, donorGroup: BloodGroup): boolean {
  return COMPATIBILITY_MATRIX[patientGroup].includes(donorGroup);
}
