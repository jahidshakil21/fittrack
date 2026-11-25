/**
 * Weight Tracker View — Log body weight (kg/lbs), trend chart (weekly/monthly), total change, history.
 */

import { getAll, getById, putItem, deleteItem } from '../db/indexeddb.js';
import {
  formatWeight,
  kgToLbs,
  lbsToKg,
  convertWeightForInput,
  calculateWeightChange,
} from '../utils/calculations.js';
import { toLocalDateString, formatShortDate, generateId, getPastDates } from '../utils/date.js';
import { validatePositiveNumber, validateDateString } from '../utils/validation.js';
import { escapeHtml, renderChart, showToast } from '../utils/ui.js';

export async function renderWeight(container) {
  const [weights, profile] = await Promise.all([
    getAll('weights'),
    getById('profile', 'user'),
  ]);

  let unit = profile?.preferredUnit || 'kg';
  let chartRange = 'monthly';

  const sortedDesc = [...weights].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const sortedAsc = [...sortedDesc].reverse();
  const latest = sortedDesc[0];
  const change = calculateWeightChange(weights);

  const formatDiff = (diffKg) => {
    if (diffKg === 0) return `0 ${unit}`;
    const val = unit === 'lbs' ? kgToLbs(Math.abs(diffKg)) : Math.round(Math.abs(diffKg) * 10) / 10;
    const sign = diffKg > 0 ? '+' : '-';
    return `${sign}${val} ${unit}`;
  };

  container.innerHTML = `
    <div class="stack-lg view-enter">
      <div class="section-header">
        <div>
          <h1>Weight Tracker</h1>
          <p class="stat-sub">Track body weight &amp; long-term trends</p>
        </div>
        <div class="segmented" style="width: 110px;">
          <button type="button" class="${unit === 'kg' ? 'active' : ''}" data-unit="kg">kg</button>
          <button type="button" class="${unit === 'lbs' ? 'active' : ''}" data-unit="lbs">lbs</button>
        </div>
      </div>

      <section class="grid-2">
        <div class="card stack-xs">
          <span class="stat-label">Latest Weight</span>
          <div class="stat-value tabular-nums">${formatWeight(latest?.weightKg ?? profile?.currentWeightKg, unit)}</div>
          <div class="stat-sub">${latest ? formatShortDate(latest.date) : 'No entries yet'}</div>
        </div>
        <div class="card stack-xs">
          <span class="stat-label">Total Change</span>
          <div class="stat-value tabular-nums ${change && change.diffKg < 0 ? 'text-accent' : ''}">
            ${change ? formatDiff(change.diffKg) : '—'}
          </div>
          <div class="stat-sub">${weights.length >= 2 ? `Across ${weights.length} logs` : 'Log 2+ entries'}</div>
        </div>
      </section>

      <!-- Log Weight Form -->
      <section class="card stack-sm">
        <h2>Log Measurement</h2>
        <form id="weight-form" class="form-grid" novalidate>
          <div class="grid-2">
            <div class="field">
              <label for="wt-val">Weight (${unit})</label>
              <input id="wt-val" class="input" type="number" step="0.1" min="20" max="700" placeholder="${unit === 'kg' ? '75.5' : '166.4'}" required />
            </div>
            <div class="field">
              <label for="wt-date">Date</label>
              <input id="wt-date" class="input" type="date" value="${toLocalDateString()}" required />
            </div>
          </div>
          <div class="field">
            <label for="wt-note">Note (optional)</label>
            <input id="wt-note" class="input" type="text" placeholder="Morning weigh-in" />
          </div>
          <div id="wt-error" class="field-error" role="alert"></div>
          <button type="submit" class="btn btn-primary btn-block">Save Weight</button>
        </form>
      </section>

      <!-- Weight Trend Chart -->
      <section class="card stack-sm">
        <div class="row-between">
          <h2>Progress Chart</h2>
          <div class="segmented" style="width: 170px;">
            <button type="button" class="${chartRange === 'weekly' ? 'active' : ''}" data-wrange="weekly">7 Days</button>
            <button type="button" class="${chartRange === 'monthly' ? 'active' : ''}" data-wrange="monthly">30 Days</button>
          </div>
        </div>
        <div class="chart-wrap">
          <canvas id="weight-trend-chart"></canvas>
        </div>
      </section>

      <!-- History -->
      <section class="stack-sm">
        <h2>Measurement History</h2>
        ${sortedDesc.length === 0 ? `
          <div class="empty-state">No weight measurements recorded yet.</div>
        ` : sortedDesc.map((entry) => `
          <div class="list-item">
            <div>
              <strong class="tabular-nums">${formatWeight(entry.weightKg, unit)}</strong>
              <div class="stat-sub">${formatShortDate(entry.date)}${entry.note ? ` · ${escapeHtml(entry.note)}` : ''}</div>
            </div>
            <button class="btn btn-danger btn-sm" type="button" data-del-weight="${entry.id}">Delete</button>
          </div>
        `).join('')}
      </section>
    </div>
  `;

  function drawWeightChart() {
    const days = chartRange === 'weekly' ? 7 : 30;
    const cutoff = getPastDates(days)[0];
    const filtered = sortedAsc.filter((w) => w.date >= cutoff);

    const labels = filtered.map((w) => formatShortDate(w.date));
    const values = filtered.map((w) => convertWeightForInput(w.weightKg, unit));

    renderChart(container.querySelector('#weight-trend-chart'), 'weight-trend', {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['No data'],
        datasets: [
          {
            label: `Weight (${unit})`,
            data: values.length ? values : [0],
            borderColor: '#a3e635',
            backgroundColor: 'rgba(163, 230, 53, 0.14)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
          },
        ],
      },
    });
  }

  drawWeightChart();

  container.querySelectorAll('[data-unit]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const nextUnit = btn.dataset.unit;
      if (profile) {
        await putItem('profile', { ...profile, preferredUnit: nextUnit, updatedAt: Date.now() });
      }
      renderWeight(container);
    });
  });

  container.querySelectorAll('[data-wrange]').forEach((btn) => {
    btn.addEventListener('click', () => {
      chartRange = btn.dataset.wrange;
      container.querySelectorAll('[data-wrange]').forEach((b) => b.classList.toggle('active', b === btn));
      drawWeightChart();
    });
  });

  container.querySelector('#weight-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawVal = container.querySelector('#wt-val').value;
    const date = container.querySelector('#wt-date').value;
    const note = container.querySelector('#wt-note').value.trim();
    const errEl = container.querySelector('#wt-error');

    const min = unit === 'kg' ? 20 : 44;
    const max = unit === 'kg' ? 350 : 770;
    const err =
      validatePositiveNumber(rawVal, `Weight (${unit})`, { min, max }) ||
      validateDateString(date);

    if (err) {
      errEl.textContent = err;
      return;
    }

    const weightKg = unit === 'lbs' ? lbsToKg(Number(rawVal)) : Math.round(Number(rawVal) * 100) / 100;

    await putItem('weights', {
      id: generateId('wgt'),
      date,
      weightKg,
      note,
      createdAt: Date.now(),
    });

    if (profile) {
      await putItem('profile', { ...profile, currentWeightKg: weightKg, updatedAt: Date.now() });
    }

    showToast('Weight saved');
    renderWeight(container);
  });

  container.querySelectorAll('[data-del-weight]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteItem('weights', btn.dataset.delWeight);
      showToast('Measurement deleted');
      renderWeight(container);
    });
  });
}
