/**
 * Water Tracker View — Hydration goal, quick +250/+500/custom ml, progress bar, 7-day chart & history.
 */

import { getAll, getById, putItem, deleteItem } from '../db/indexeddb.js';
import { sumByDate } from '../utils/calculations.js';
import {
  toLocalDateString,
  getPastDates,
  formatShortDate,
  formatWeekdayShort,
  generateId,
} from '../utils/date.js';
import { validatePositiveNumber } from '../utils/validation.js';
import { renderChart, showToast } from '../utils/ui.js';

export async function renderWater(container) {
  const today = toLocalDateString();
  const [profile, waterLogs] = await Promise.all([
    getById('profile', 'user'),
    getAll('water'),
  ]);

  const goalMl = Number(profile?.dailyWaterGoalMl) || 2500;
  const todayTotal = sumByDate(waterLogs, today, 'amountMl');
  const pct = Math.min(100, Math.round((todayTotal / goalMl) * 100));

  const todayLogs = waterLogs
    .filter((w) => w.date === today)
    .sort((a, b) => b.timestamp - a.timestamp);

  const weekDates = getPastDates(7);

  container.innerHTML = `
    <div class="stack-lg view-enter">
      <div class="section-header">
        <div>
          <h1>Water Tracker</h1>
          <p class="stat-sub">Daily hydration &amp; history</p>
        </div>
        <span class="pill pill-water">${pct}%</span>
      </div>

      <section class="card stack-sm">
        <div class="row-between">
          <div>
            <span class="stat-label">Today's Hydration</span>
            <div class="stat-value tabular-nums text-water">${todayTotal} ml</div>
            <div class="stat-sub">Goal: ${goalMl} ml</div>
          </div>
          <div style="text-align:right;">
            <span class="stat-sub">Remaining</span>
            <div style="font-weight:700;" class="tabular-nums">${Math.max(0, goalMl - todayTotal)} ml</div>
          </div>
        </div>
        <div class="progress-track" style="height:14px;">
          <div class="progress-fill water" style="width:${pct}%"></div>
        </div>

        <div class="grid-2" style="margin-top:6px;">
          <button class="btn btn-water" type="button" data-add-water="250">+ 250 ml</button>
          <button class="btn btn-water" type="button" data-add-water="500">+ 500 ml</button>
        </div>

        <form id="custom-water-form" class="row" style="margin-top:4px;" novalidate>
          <input id="cw-amount" class="input" type="number" min="10" max="5000" placeholder="Custom ml (e.g., 350)" aria-label="Custom water amount in ml" />
          <button class="btn btn-secondary" type="submit" style="flex-shrink:0;">Add</button>
        </form>
        <div id="cw-error" class="field-error" role="alert"></div>
      </section>

      <section class="card stack-sm">
        <h2>Daily Hydration Goal</h2>
        <form id="water-goal-form" class="row" novalidate>
          <input id="wg-ml" class="input" type="number" min="500" max="10000" step="100" value="${goalMl}" aria-label="Daily water goal in ml" />
          <button class="btn btn-primary" type="submit" style="flex-shrink:0;">Save Goal</button>
        </form>
        <div id="wg-error" class="field-error" role="alert"></div>
      </section>

      <section class="card stack-sm">
        <h2>7-Day Hydration History</h2>
        <div class="chart-wrap">
          <canvas id="water-week-chart"></canvas>
        </div>
      </section>

      <section class="stack-sm">
        <h2>Today's Logs</h2>
        ${todayLogs.length === 0 ? `
          <div class="empty-state">No water logged today yet.</div>
        ` : todayLogs.map((log) => `
          <div class="list-item">
            <div>
              <strong class="tabular-nums text-water">+${log.amountMl} ml</strong>
              <div class="stat-sub">${new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${formatShortDate(log.date)}</div>
            </div>
            <button class="btn btn-danger btn-sm" type="button" data-del-water="${log.id}">Delete</button>
          </div>
        `).join('')}
      </section>
    </div>
  `;

  const addWater = async (amountMl) => {
    await putItem('water', {
      id: generateId('wat'),
      date: today,
      amountMl: Math.round(amountMl),
      timestamp: Date.now(),
    });
    showToast(`Added ${Math.round(amountMl)} ml`);
    renderWater(container);
  };

  container.querySelectorAll('[data-add-water]').forEach((btn) => {
    btn.addEventListener('click', () => addWater(Number(btn.dataset.addWater)));
  });

  container.querySelector('#custom-water-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = Number(container.querySelector('#cw-amount').value);
    const err = validatePositiveNumber(val, 'Custom amount', { min: 10, max: 5000 });
    if (err) {
      container.querySelector('#cw-error').textContent = err;
      return;
    }
    await addWater(val);
  });

  container.querySelector('#water-goal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = Number(container.querySelector('#wg-ml').value);
    const err = validatePositiveNumber(val, 'Daily goal', { min: 500, max: 10000 });
    if (err) {
      container.querySelector('#wg-error').textContent = err;
      return;
    }
    await putItem('profile', { ...profile, dailyWaterGoalMl: Math.round(val), updatedAt: Date.now() });
    showToast('Hydration goal updated');
    renderWater(container);
  });

  container.querySelectorAll('[data-del-water]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteItem('water', btn.dataset.delWater);
      showToast('Water entry deleted');
      renderWater(container);
    });
  });

  renderChart(container.querySelector('#water-week-chart'), 'water-week', {
    type: 'bar',
    data: {
      labels: weekDates.map((d) => formatWeekdayShort(d)),
      datasets: [
        {
          label: 'Water (ml)',
          data: weekDates.map((d) => sumByDate(waterLogs, d, 'amountMl')),
          backgroundColor: '#38bdf8',
          borderRadius: 6,
        },
      ],
    },
    options: { scales: { y: { beginAtZero: true } } },
  });
}
