/**
 * Default beginner-friendly 7-day home workout plan.
 * Stored in IndexedDB on first launch so the user can customize it.
 */

export const DEFAULT_WORKOUT_PLAN = {
  id: 'default_beginner_home',
  name: 'Beginner Fat-Loss & Strength (Home)',
  isCustom: false,
  updatedAt: Date.now(),
  schedule: [
    {
      day: 'monday',
      label: 'Monday',
      title: 'Full-Body Strength A',
      type: 'Strength',
      durationMin: 30,
      exercises: ['Bodyweight Squat', 'Incline Push-Up', 'Glute Bridge', 'Dead Bug'],
      recoveryNote: 'Rest 60s between sets. Focus on clean form over speed.',
    },
    {
      day: 'tuesday',
      label: 'Tuesday',
      title: 'Low-Impact Cardio & Core',
      type: 'Cardio',
      durationMin: 25,
      exercises: ['High-Knee March in Place', 'Low-Impact Step Jacks', 'Forearm Plank (or Knee Plank)'],
      recoveryNote: 'Keep a conversational pace; hydrate well after finishing.',
    },
    {
      day: 'wednesday',
      label: 'Wednesday',
      title: 'Active Recovery & Mobility',
      type: 'Rest',
      durationMin: 15,
      exercises: ['Cat-Cow Mobility Flow', 'Kneeling Hip Flexor Stretch'],
      recoveryNote: 'Take a 20-minute easy walk if you feel good, or rest completely.',
    },
    {
      day: 'thursday',
      label: 'Thursday',
      title: 'Upper & Lower Strength B',
      type: 'Strength',
      durationMin: 30,
      exercises: ['Reverse Lunge', 'Single-Arm Row (or Backpack Row)', 'Seated or Standing Overhead Press', 'Bird Dog'],
      recoveryNote: 'Use 60–90s rest between strength sets.',
    },
    {
      day: 'friday',
      label: 'Friday',
      title: 'Beginner Conditioning',
      type: 'Cardio',
      durationMin: 25,
      exercises: ['Incline Mountain Climber', 'Low-Impact Step Jacks', 'Modified Inchworm'],
      recoveryNote: 'Pause anytime your breathing feels too strained.',
    },
    {
      day: 'saturday',
      label: 'Saturday',
      title: 'Full-Body Light Circuit',
      type: 'Strength',
      durationMin: 25,
      exercises: ['Bodyweight Squat', 'Incline Push-Up', 'Glute Bridge', 'Cat-Cow Mobility Flow'],
      recoveryNote: 'Great day for a brisk outdoor walk as well.',
    },
    {
      day: 'sunday',
      label: 'Sunday',
      title: 'Full Rest Day',
      type: 'Rest',
      durationMin: 0,
      exercises: [],
      recoveryNote: 'Prioritize sleep, hydration, and meal prep for the week ahead.',
    },
  ],
};
