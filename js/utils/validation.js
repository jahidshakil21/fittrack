/**
 * Input and JSON backup schema validation.
 */

export function validatePositiveNumber(value, label, { min = 0.1, max = 100000 } = {}) {
  const num = Number(value);
  if (value === '' || value === null || value === undefined || Number.isNaN(num)) {
    return `${label} must be a valid number.`;
  }
  if (num < min || num > max) {
    return `${label} must be between ${min} and ${max}.`;
  }
  return null;
}

export function validateNonEmptyText(value, label, maxLen = 120) {
  const str = String(value ?? '').trim();
  if (!str) return `${label} is required.`;
  if (str.length > maxLen) return `${label} must be ${maxLen} characters or fewer.`;
  return null;
}

export function validateDateString(value, label = 'Date') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
    return `${label} must be in YYYY-MM-DD format.`;
  }
  return null;
}

const REQUIRED_BACKUP_STORES = [
  'profile',
  'workouts',
  'weights',
  'foods',
  'mealPlans',
  'water',
  'workoutPlans',
];

export function validateBackupPayload(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Backup file is not a valid JSON object.' };
  }
  if (data.app !== 'FITTRACK' || typeof data.version !== 'number') {
    return { valid: false, error: 'This file does not appear to be a valid FITTRACK backup.' };
  }
  if (!data.stores || typeof data.stores !== 'object') {
    return { valid: false, error: 'Backup is missing the "stores" data section.' };
  }
  for (const store of REQUIRED_BACKUP_STORES) {
    if (!Array.isArray(data.stores[store])) {
      return { valid: false, error: `Backup is missing valid "${store}" records.` };
    }
  }
  return { valid: true, error: null };
}
