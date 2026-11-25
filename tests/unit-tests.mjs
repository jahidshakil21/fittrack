import assert from 'node:assert/strict';
import {
  kgToLbs,
  lbsToKg,
  calculateBMI,
  estimateDailyCalories,
  calculateWeightChange,
  sumByDate,
} from '../js/utils/calculations.js';
import {
  validatePositiveNumber,
  validateNonEmptyText,
  validateDateString,
  validateBackupPayload,
} from '../js/utils/validation.js';
import { toLocalDateString, getPastDates } from '../js/utils/date.js';

// Unit conversions
assert.equal(kgToLbs(70), 154.3);
assert.equal(lbsToKg(154.32), 70);

// BMI
const bmi = calculateBMI(75, 175);
assert.equal(bmi.value, 24.5);
assert.equal(bmi.category, 'Normal weight');
assert.equal(calculateBMI(0, 175), null);

// Calorie estimates (requires age, height, weight, activityLevel)
assert.equal(estimateDailyCalories({ age: 30, heightCm: 175 }), null);
const est = estimateDailyCalories({
  age: 30,
  heightCm: 175,
  currentWeightKg: 80,
  gender: 'male',
  activityLevel: 'moderate',
  goal: 'fat_loss',
});
assert.ok(est.maintenance > 2400 && est.maintenance < 2900);
assert.equal(est.recommended, est.maintenance - 400);

// Weight change
const chg = calculateWeightChange([
  { date: '2026-11-01', weightKg: 82, createdAt: 1 },
  { date: '2026-11-15', weightKg: 80.5, createdAt: 2 },
]);
assert.equal(chg.diffKg, -1.5);

// Sum by date
const totalCal = sumByDate(
  [
    { date: '2026-11-25', calories: 400 },
    { date: '2026-11-25', calories: 650 },
    { date: '2026-11-24', calories: 500 },
  ],
  '2026-11-25',
  'calories'
);
assert.equal(totalCal, 1050);

// Validation
assert.equal(validatePositiveNumber(10, 'Weight', { min: 1, max: 100 }), null);
assert.ok(validatePositiveNumber(-5, 'Weight', { min: 1, max: 100 }));
assert.equal(validateNonEmptyText('Squat', 'Name'), null);
assert.ok(validateNonEmptyText('   ', 'Name'));
assert.equal(validateDateString('2026-11-25'), null);
assert.ok(validateDateString('11/25/2026'));

// Backup validation
assert.equal(validateBackupPayload({ app: 'OTHER' }).valid, false);
assert.equal(
  validateBackupPayload({
    app: 'FITTRACK',
    version: 1,
    stores: {
      profile: [],
      workouts: [],
      weights: [],
      foods: [],
      mealPlans: [],
      water: [],
      workoutPlans: [],
    },
  }).valid,
  true
);

// Date helpers
assert.match(toLocalDateString(new Date(2026, 10, 25)), /^2026-11-25$/);
assert.equal(getPastDates(7).length, 7);

console.log('All FITTRACK unit tests passed!');
