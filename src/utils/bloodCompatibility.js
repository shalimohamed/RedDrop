export const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

const COMPATIBILITY = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': BLOOD_TYPES,
};

export function isCompatible(donorType, requiredType) {
  if (!donorType || !requiredType) return false;
  const eligibleDonors = COMPATIBILITY[requiredType];
  return Boolean(eligibleDonors && eligibleDonors.includes(donorType));
}

export function eligibleDonorTypesFor(requiredType) {
  return COMPATIBILITY[requiredType] ?? [];
}
