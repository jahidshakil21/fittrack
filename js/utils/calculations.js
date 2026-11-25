/**
 * Fitness, unit conversion, and statistical calculations.
 * All weight values are stored canonically in kg and converted for display.
 */

const KG_TO_LBS = 2.2046226218;

export function kgToLbs(kg) {
  return Math.round(kg * KG_TO_LBS * 10) / 10;
}

export function lbsToKg(lbs) {
  return Math.round((lbs / KG_TO_LBS) * 100) / 100;
}

export function formatWeight(kg, unit = 'kg') {
  if (kg === '' || kg === null || kg === undefined || Number.isNaN(Number(kg))) return '—';
  const val = unit === 'lbs' ? kgToLbs(Number(kg)) : Math.round(Number(kg) * 10) / 10;
  return `${val} ${unit}`;
}

export function convertWeightForInput(kg, unit = 'kg') {
  if (kg === '' || kg === null || kg === undefined || Number.isNaN(Number(kg))) return '';
  return unit === 'lbs' ? kgToLbs(Number(kg)) : Math.round(Number(kg) * 10) / 10;
}

export function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const rounded = Math.round(bmi * 10) / 10;

  let category = 'Normal weight';
  if (rounded < 18.5) category = 'Underweight';
  else if (rounded < 25) category = 'Normal weight';
  else if (rounded < 30) category = 'Overweight';
  else category = 'Obesity';

  return { value: rounded, category };
}

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Estimates daily maintenance & goal calories using Mifflin-St Jeor only when
 * age, heightCm, currentWeightKg, and activityLevel are all provided.
 * Returns null if required fields are missing.
 */
export function estimateDailyCalories(profile) {
  if (!profile) return null;
  const { age, heightCm, currentWeightKg, gender, activityLevel, goal } = profile;
  if (!age || !heightCm || !currentWeightKg || !activityLevel) return null;

  const base = 10 * currentWeightKg + 6.25 * heightCm - 5 * age;
  let bmr;
  if (gender === 'male') {
    bmr = base + 5;
  } else if (gender === 'female') {
    bmr = base - 161;
  } else {
    // Neutral midpoint when gender is omitted or non-binary
    bmr = base - 78;
  }

  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.375;
  const maintenance = Math.round(bmr * multiplier);

  let recommended = maintenance;
  let note = 'Estimated maintenance intake';
  if (goal === 'fat_loss') {
    recommended = Math.max(1200, maintenance - 400);
    note = 'Mild fat-loss estimate (~400 kcal below maintenance)';
  } else if (goal === 'muscle_gain') {
    recommended = maintenance + 250;
    note = 'Lean muscle-gain estimate (~250 kcal above maintenance)';
  }

  return {
    bmr: Math.round(bmr),
    maintenance,
    recommended,
    note,
  };
}

export function calculateWeightChange(weights) {
  if (!weights || weights.length < 2) return null;
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  const first = sorted[0].weightKg;
  const latest = sorted[sorted.length - 1].weightKg;
  const diffKg = Math.round((latest - first) * 100) / 100;
  return { firstKg: first, latestKg: latest, diffKg };
}

export function sumByDate(items, dateStr, field) {
  return items
    .filter((item) => item.date === dateStr)
    .reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
}

export function countWorkoutsInDates(workouts, dateSet) {
  return workouts.filter((w) => dateSet.has(w.date)).length;
}

export function sumWorkoutMinutesInDates(workouts, dateSet) {
  return workouts
    .filter((w) => dateSet.has(w.date))
    .reduce((sum, w) => sum + (Number(w.durationMin) || 0), 0);
}
