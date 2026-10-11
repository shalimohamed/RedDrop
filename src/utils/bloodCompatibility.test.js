import { describe, expect, it } from 'vitest';
import { BLOOD_TYPES, eligibleDonorTypesFor, isCompatible } from './bloodCompatibility';

describe('isCompatible (FR-013)', () => {
  it('O- is the universal donor — compatible with every recipient type', () => {
    for (const requiredType of BLOOD_TYPES) {
      expect(isCompatible('O-', requiredType)).toBe(true);
    }
  });

  it('AB+ is the universal recipient — accepts every donor type', () => {
    for (const donorType of BLOOD_TYPES) {
      expect(isCompatible(donorType, 'AB+')).toBe(true);
    }
  });

  it('rejects an incompatible pairing', () => {
    expect(isCompatible('A+', 'O-')).toBe(false);
    expect(isCompatible('B+', 'A-')).toBe(false);
  });

  it('accepts an exact type match', () => {
    expect(isCompatible('B-', 'B-')).toBe(true);
  });

  it('returns false when either type is missing', () => {
    expect(isCompatible('', 'O+')).toBe(false);
    expect(isCompatible('O+', '')).toBe(false);
    expect(isCompatible(null, 'O+')).toBe(false);
    expect(isCompatible('O+', undefined)).toBe(false);
  });

  it('returns false for an unrecognized required type', () => {
    expect(isCompatible('O-', 'Z+')).toBe(false);
  });
});

describe('eligibleDonorTypesFor (FR-009 matching)', () => {
  it('lists every donor type eligible for AB+ (universal recipient)', () => {
    expect(eligibleDonorTypesFor('AB+')).toEqual(BLOOD_TYPES);
  });

  it('lists only O- for an O- appeal', () => {
    expect(eligibleDonorTypesFor('O-')).toEqual(['O-']);
  });

  it('returns an empty array for an unrecognized type', () => {
    expect(eligibleDonorTypesFor('Z+')).toEqual([]);
  });
});
