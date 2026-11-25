/**
 * Dashboard View — Daily overview, progress indicators, quick actions, and weekly summary.
 */

import { getAll, getById, putItem } from '../db/indexeddb.js';
import {
  formatWeight,
  sumByDate,
  countWorkoutsInDates,
  sumWorkoutMinutesInDates,
} from '../utils/calculations.js';
import {
  toLocalDateString,
  getPastDates,
  formatWeekdayShort,
  getTodayWeekdayKey,
  generateId,
} from '../utils/date.js';
import { escapeHtml, renderChart, showToast } from '../utils/ui.js';

export async function renderDashboard(container, { navigate }) {
  const today = toLocalDateString();
  const weekDates = getPastDates(7);
  const weekSet = new Set(weekDates);

  const [profile, workouts, weights, foods, waterLogs, plans] = await Promise.all([
    getById('profile', 'user'),
    getAll('workouts'),
    getAll('weights'),
    getAll('foods'),
    getAll('water'),
    getAll('workoutPlans'),
  ]);

  const unit = profile?.preferredUnit || 'kg';
  const calTarget = Number(profile?.dailyCalorieTarget) || 2000;
  const waterGoal = Number(profile?.dailyWaterGoalMl) || 2500;

  const todayCalories = sumByDate(foods, today, 'calories');
  const calPct = Math.min(100, Math.round((todayCalories / calTarget) * 100));

  const todayWater = sumByDate(waterLogs, today, 'amountMl');
  const waterPct = Math.min(100, Math.round((todayWater / waterGoal) * 100));

  const todayWorkouts = workouts.filter((w) => w.date === today);
  const weeklyWorkoutCount = countWorkoutsInDates(workouts, weekSet);
  const weeklyMinutes = sumWorkoutMinutesInDates(workouts, weekSet);

  const sortedWeights = [...weights].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt
  );
  const latestWeightKg = sortedWeights[0]?.weightKg ?? (profile?.currentWeightKg || null);

  const activePlan = plans[0];
  const todayPlan = activePlan?.schedule?.find((d) => d.day === getTodayWeekdayKey());

  const greetingName = profile?.name ? `, ${escapeHtml(profile.name)}` : '';

  container.innerHTML = `
    <div class="stack-lg view-enter">
      <section class="card card-accent">
        <div class="row-between">
          <div>
            <span class="stat-label">Today's Status</span>
            <h1>Welcome back${greetingName}</h1>
          </div>
          <span class="pill ${todayWorkouts.length > 0 ? 'pill-accent' : ''}">
            ${todayWorkouts.length > 0 ? `${todayWorkouts.length} Workout Done` : 'No Workout Yet'}
          </span>
        </div>
        ${todayPlan ? `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-subtle);" class="row-between">
            <div>
              <div class="stat-sub">Today's Plan (${escapeHtml(todayPlan.label)})</div>
              <strong>${escapeHtml(todayPlan.title)}</strong>
              <div class="stat-sub">${escapeHtml(todayPlan.type)}${todayPlan.durationMin ? ` · ${todayPlan.durationMin} min` : ''}</div>
            </div>
            <button class="btn btn-secondary btn-sm" type="button" id="dash-go-plan">View Plan</button>
          </div>
        ` : ''}
      </section>

      <!-- Quick Actions -->
      <section class="stack-sm">
        <div class="section-header">
          <h2>Quick Actions</h2>
        </div>
        <div class="grid-2">
          <button class="btn btn-primary" type="button" id="qa-workout">+ Log Workout</button>
          <button class="btn btn-secondary" type="button" id="qa-food">+ Add Food</button>
          <button class="btn btn-water" type="button" id="qa-water-250">+ 250 ml Water</button>
          <button class="btn btn-secondary" type="button" id="qa-weight">+ Log Weight</button>
        </div>
      </section>

      <!-- Daily Progress Cards -->
      <section class="grid-2">
        <article class="card stack-sm" data-nav-card="nutrition" style="cursor:pointer;">
          <div class="row-between">
            <span class="stat-label">Calories</span>
            <span class="pill pill-calories">${calPct}%</span>
          </div>
          <div class="stat-value tabular-nums">${todayCalories}</div>
          <div class="stat-sub">of ${calTarget} kcal goal</div>
          <div class="progress-track">
            <div class="progress-fill ${todayCalories > calTarget ? 'danger' : 'calories'}" style="width:${calPct}%"></div>
          </div>
        </article>

        <article class="card stack-sm" data-nav-card="water" style="cursor:pointer;">
          <div class="row-between">
            <span class="stat-label">Hydration</span>
            <span class="pill pill-water">${waterPct}%</span>
          </div>
          <div class="stat-value tabular-nums">${todayWater} <span style="font-size:0.9rem;font-weight:600;">ml</span></div>
          <div class="stat-sub">of ${waterGoal} ml goal</div>
          <div class="progress-track">
            <div class="progress-fill water" style="width:${waterPct}%"></div>
          </div>
        </article>

        <article class="card stack-sm" data-nav-card="weight" style="cursor:pointer;">
          <span class="stat-label">Latest Weight</span>
          <div class="stat-value tabular-nums">${formatWeight(latestWeightKg, unit)}</div>
          <div class="stat-sub">
            ${profile?.targetWeightKg ? `Target: ${formatWeight(profile.targetWeightKg, unit)}` : 'Tap to log weight'}
          </div>
        </article>

        <article class="card stack-sm" data-nav-card="workouts" style="cursor:pointer;">
          <span class="stat-label">7-Day Workouts</span>
          <div class="stat-value tabular-nums">${weeklyWorkoutCount}</div>
          <div class="stat-sub">${weeklyMinutes} total minutes</div>
        </article>
      </section>

      <!-- Weekly Activity Summary Chart -->
      <section class="card stack-sm">
        <div class="card-header">
          <div>
            <h2>Weekly Activity Summary</h2>
            <p class="stat-sub">Workout minutes &amp; calories (last 7 days)</p>
          </div>
        </div>
        <div class="chart-wrap">
          <canvas id="dash-weekly-chart" aria-label="Weekly Activity Chart"></canvas>
        </div>
      </section>
    </div>
  `;

  container.querySelector('#dash-go-plan')?.addEventListener('click', () => navigate('plans'));
  container.querySelector('#qa-workout')?.addEventListener('click', () => navigate('workouts'));
  container.querySelector('#qa-food')?.addEventListener('click', () => navigate('nutrition'));
  container.querySelector('#qa-weight')?.addEventListener('click', () => navigate('weight'));

  container.querySelector('#qa-water-250')?.addEventListener('click', async () => {
    await putItem('water', {
      id: generateId('wat'),
      date: today,
      amountMl: 250,
      timestamp: Date.now(),
    });
    showToast('Added 250 ml water');
    renderDashboard(container, { navigate });
  });

  container.querySelectorAll('[data-nav-card]').forEach((el) => {
    el.addEventListener('click', () => navigate(el.dataset.navCard));
  });

  const labels = weekDates.map((d) => formatWeekdayShort(d));
  const workoutMins = weekDates.map((d) => sumByDate(workouts, d, 'durationMin'));
  const calorieVals = weekDates.map((d) => sumByDate(foods, d, 'calories'));

  renderChart(container.querySelector('#dash-weekly-chart'), 'dash-weekly', {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Workout (min)',
          data: workoutMins,
          backgroundColor: 'rgba(163, 230, 53, 0.85)',
          borderRadius: 6,
          yAxisID: 'y',
        },
        {
          label: 'Calories (kcal)',
          data: calorieVals,
          type: 'line',
          borderColor: '#fbbf24',
          backgroundColor: 'rgba(251, 191, 36, 0.15)',
          tension: 0.3,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      scales: {
        y: { beginAtZero: true, position: 'left' },
        y1: {
          beginAtZero: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#fbbf24', font: { size: 10 } },
        },
      },
    },
  });
}
