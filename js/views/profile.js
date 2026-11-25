/**
 * Profile & Personalization View — Personal metrics, BMI, and conditional calorie estimate.
 */

import { getById, putItem } from '../db/indexeddb.js';
import {
  calculateBMI,
  estimateDailyCalories,
  convertWeightForInput,
  lbsToKg,
} from '../utils/calculations.js';
import { validatePositiveNumber } from '../utils/validation.js';
import { escapeHtml, showToast } from '../utils/ui.js';

export async function renderProfile(container) {
  const profile = await getById('profile', 'user');
  const unit = profile?.preferredUnit || 'kg';

  const bmi = calculateBMI(Number(profile?.currentWeightKg), Number(profile?.heightCm));
  const calEst = estimateDailyCalories(profile);

  container.innerHTML = `
    <div class="stack-lg view-enter">
      <div>
        <h1>Profile &amp; Goals</h1>
        <p class="stat-sub">Personalize targets, BMI, and calorie estimates</p>
      </div>

      <section class="grid-2">
        <div class="card stack-xs">
          <span class="stat-label">BMI</span>
          <div class="stat-value tabular-nums">${bmi ? bmi.value : '—'}</div>
          <div class="stat-sub">${bmi ? escapeHtml(bmi.category) : 'Enter height & weight'}</div>
        </div>
        <div class="card stack-xs">
          <span class="stat-label">Estimated Intake</span>
          <div class="stat-value tabular-nums">${calEst ? `${calEst.recommended}` : '—'}</div>
          <div class="stat-sub">${calEst ? 'kcal/day (estimate)' : 'Complete metrics below'}</div>
        </div>
      </section>

      ${calEst ? `
        <div class="notice-box">
          <strong>${escapeHtml(calEst.note)}</strong> (Estimated maintenance: ${calEst.maintenance} kcal/day).
          <br />These figures are general mathematical estimates based on the Mifflin-St Jeor equation and are <strong>not medical prescriptions</strong>.
        </div>
      ` : `
        <div class="notice-box">
          Enter your age, height, current weight, and activity level to view an estimated daily calorie range. Estimates are informational only and are <strong>not medical prescriptions</strong>.
        </div>
      `}

      <section class="card">
        <form id="profile-form" class="form-grid" novalidate>
          <div class="field">
            <label for="pf-name">Name (optional)</label>
            <input id="pf-name" class="input" type="text" value="${escapeHtml(profile?.name || '')}" placeholder="Alex" />
          </div>

          <div class="grid-2">
            <div class="field">
              <label for="pf-age">Age (years)</label>
              <input id="pf-age" class="input" type="number" min="13" max="110" value="${escapeHtml(profile?.age || '')}" placeholder="28" />
            </div>
            <div class="field">
              <label for="pf-height">Height (cm)</label>
              <input id="pf-height" class="input" type="number" min="90" max="250" value="${escapeHtml(profile?.heightCm || '')}" placeholder="175" />
            </div>
          </div>

          <div class="grid-2">
            <div class="field">
              <label for="pf-cur-wt">Current Weight (${unit})</label>
              <input id="pf-cur-wt" class="input" type="number" step="0.1" value="${convertWeightForInput(profile?.currentWeightKg, unit)}" placeholder="${unit === 'kg' ? '78' : '172'}" />
            </div>
            <div class="field">
              <label for="pf-tgt-wt">Target Weight (${unit})</label>
              <input id="pf-tgt-wt" class="input" type="number" step="0.1" value="${convertWeightForInput(profile?.targetWeightKg, unit)}" placeholder="${unit === 'kg' ? '70' : '154'}" />
            </div>
          </div>

          <div class="grid-2">
            <div class="field">
              <label for="pf-gender">Gender (optional)</label>
              <select id="pf-gender" class="select">
                <option value="" ${!profile?.gender ? 'selected' : ''}>Prefer not to say</option>
                <option value="female" ${profile?.gender === 'female' ? 'selected' : ''}>Female</option>
                <option value="male" ${profile?.gender === 'male' ? 'selected' : ''}>Male</option>
              </select>
            </div>
            <div class="field">
              <label for="pf-activity">Activity Level</label>
              <select id="pf-activity" class="select">
                <option value="sedentary" ${profile?.activityLevel === 'sedentary' ? 'selected' : ''}>Sedentary</option>
                <option value="light" ${profile?.activityLevel === 'light' ? 'selected' : ''}>Lightly Active (1–3d/wk)</option>
                <option value="moderate" ${profile?.activityLevel === 'moderate' ? 'selected' : ''}>Moderately Active (3–5d/wk)</option>
                <option value="active" ${profile?.activityLevel === 'active' ? 'selected' : ''}>Very Active (6–7d/wk)</option>
              </select>
            </div>
          </div>

          <div class="grid-2">
            <div class="field">
              <label for="pf-exp">Fitness Experience</label>
              <select id="pf-exp" class="select">
                <option value="beginner" ${profile?.experience === 'beginner' ? 'selected' : ''}>Beginner</option>
                <option value="intermediate" ${profile?.experience === 'intermediate' ? 'selected' : ''}>Intermediate</option>
                <option value="advanced" ${profile?.experience === 'advanced' ? 'selected' : ''}>Advanced</option>
              </select>
            </div>
            <div class="field">
              <label for="pf-goal">Primary Goal</label>
              <select id="pf-goal" class="select">
                <option value="fat_loss" ${profile?.goal === 'fat_loss' ? 'selected' : ''}>Lose Body Fat</option>
                <option value="maintenance" ${profile?.goal === 'maintenance' ? 'selected' : ''}>Improve Fitness / Maintain</option>
                <option value="muscle_gain" ${profile?.goal === 'muscle_gain' ? 'selected' : ''}>Build Strength &amp; Muscle</option>
              </select>
            </div>
          </div>

          <div class="grid-2">
            <div class="field">
              <label for="pf-loc">Exercise Location</label>
              <select id="pf-loc" class="select">
                <option value="home" ${profile?.location === 'home' ? 'selected' : ''}>Home</option>
                <option value="gym" ${profile?.location === 'gym' ? 'selected' : ''}>Gym</option>
                <option value="outdoors" ${profile?.location === 'outdoors' ? 'selected' : ''}>Outdoors</option>
              </select>
            </div>
            <div class="field">
              <label for="pf-cal-target">Daily Calorie Target (kcal)</label>
              <input id="pf-cal-target" class="input" type="number" min="1000" max="8000" value="${profile?.dailyCalorieTarget || 2000}" />
            </div>
          </div>

          <div id="pf-error" class="field-error" role="alert"></div>
          <button type="submit" class="btn btn-primary btn-block">Save Profile</button>
        </form>
      </section>
    </div>
  `;

  container.querySelector('#profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ageVal = container.querySelector('#pf-age').value;
    const heightVal = container.querySelector('#pf-height').value;
    const curWtVal = container.querySelector('#pf-cur-wt').value;
    const tgtWtVal = container.querySelector('#pf-tgt-wt').value;
    const calTargetVal = container.querySelector('#pf-cal-target').value;

    const err =
      (ageVal !== '' ? validatePositiveNumber(ageVal, 'Age', { min: 13, max: 110 }) : null) ||
      (heightVal !== '' ? validatePositiveNumber(heightVal, 'Height (cm)', { min: 90, max: 250 }) : null) ||
      (curWtVal !== '' ? validatePositiveNumber(curWtVal, `Current weight (${unit})`, { min: 20, max: 770 }) : null) ||
      (tgtWtVal !== '' ? validatePositiveNumber(tgtWtVal, `Target weight (${unit})`, { min: 20, max: 770 }) : null) ||
      validatePositiveNumber(calTargetVal, 'Daily Calorie Target', { min: 1000, max: 8000 });

    const errEl = container.querySelector('#pf-error');
    if (err) {
      errEl.textContent = err;
      return;
    }

    const toKg = (v) => (v === '' ? '' : unit === 'lbs' ? lbsToKg(Number(v)) : Number(v));

    await putItem('profile', {
      ...profile,
      name: container.querySelector('#pf-name').value.trim(),
      age: ageVal !== '' ? Number(ageVal) : '',
      heightCm: heightVal !== '' ? Number(heightVal) : '',
      currentWeightKg: toKg(curWtVal),
      targetWeightKg: toKg(tgtWtVal),
      gender: container.querySelector('#pf-gender').value,
      activityLevel: container.querySelector('#pf-activity').value,
      experience: container.querySelector('#pf-exp').value,
      goal: container.querySelector('#pf-goal').value,
      location: container.querySelector('#pf-loc').value,
      dailyCalorieTarget: Math.round(Number(calTargetVal)),
      updatedAt: Date.now(),
    });

    showToast('Profile saved');
    renderProfile(container);
  });
}
