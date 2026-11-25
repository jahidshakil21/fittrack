/**
 * Workout Tracker View — Create/edit/delete workouts, exercise rows, frequency, weekly/monthly charts.
 */

import { getAll, getById, putItem, deleteItem } from '../db/indexeddb.js';
import { EXERCISES } from '../data/exercises.js';
import {
  toLocalDateString,
  getPastDates,
  formatShortDate,
  formatWeekdayShort,
  generateId,
} from '../utils/date.js';
import { countWorkoutsInDates, sumWorkoutMinutesInDates } from '../utils/calculations.js';
import { validateNonEmptyText, validatePositiveNumber, validateDateString } from '../utils/validation.js';
import { escapeHtml, openModal, closeModal, renderChart, showToast } from '../utils/ui.js';

export async function renderWorkouts(container) {
  const [workouts, profile] = await Promise.all([
    getAll('workouts'),
    getById('profile', 'user'),
  ]);

  const unit = profile?.preferredUnit || 'kg';
  const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  const weekDates = getPastDates(7);
  const monthDates = getPastDates(30);
  const weekSet = new Set(weekDates);
  const monthSet = new Set(monthDates);

  const weekCount = countWorkoutsInDates(workouts, weekSet);
  const weekMins = sumWorkoutMinutesInDates(workouts, weekSet);
  const monthCount = countWorkoutsInDates(workouts, monthSet);
  const monthMins = sumWorkoutMinutesInDates(workouts, monthSet);

  let chartRange = 'weekly';

  container.innerHTML = `
    <div class="stack-lg view-enter">
      <div class="section-header">
        <div>
          <h1>Workouts</h1>
          <p class="stat-sub">Log sessions, sets, reps &amp; weights</p>
        </div>
        <button class="btn btn-primary" type="button" id="btn-new-workout">+ Log Workout</button>
      </div>

      <section class="grid-2">
        <div class="card stack-xs">
          <span class="stat-label">Last 7 Days</span>
          <div class="stat-value tabular-nums">${weekCount} <span class="stat-sub">sessions</span></div>
          <div class="stat-sub">${weekMins} min total</div>
        </div>
        <div class="card stack-xs">
          <span class="stat-label">Last 30 Days</span>
          <div class="stat-value tabular-nums">${monthCount} <span class="stat-sub">sessions</span></div>
          <div class="stat-sub">${monthMins} min total</div>
        </div>
      </section>

      <section class="card stack-sm">
        <div class="row-between">
          <h2>Workout Frequency</h2>
          <div class="segmented" style="width: 170px;">
            <button type="button" class="active" data-range="weekly">7 Days</button>
            <button type="button" data-range="monthly">30 Days</button>
          </div>
        </div>
        <div class="chart-wrap">
          <canvas id="workout-freq-chart"></canvas>
        </div>
      </section>

      <section class="stack-sm">
        <h2>Workout History</h2>
        ${sorted.length === 0 ? `
          <div class="empty-state">
            <p>No workouts logged yet. Tap <strong>+ Log Workout</strong> to record your first session.</p>
          </div>
        ` : sorted.map((w) => `
          <article class="card stack-sm">
            <div class="row-between">
              <div>
                <h3>${escapeHtml(w.name)}</h3>
                <div class="stat-sub">${formatShortDate(w.date)} · ${w.durationMin} min</div>
              </div>
              <div class="row">
                <button class="btn btn-ghost btn-sm" type="button" data-edit-workout="${w.id}">Edit</button>
                <button class="btn btn-danger btn-sm" type="button" data-del-workout="${w.id}">Delete</button>
              </div>
            </div>
            ${w.exercises?.length ? `
              <div class="stack-xs">
                ${w.exercises.map((ex) => `
                  <div class="list-item" style="padding:8px 10px;">
                    <span style="font-size:0.88rem;font-weight:600;">${escapeHtml(ex.name)}</span>
                    <span class="stat-sub tabular-nums">
                      ${ex.sets} × ${ex.reps}${ex.weight ? ` @ ${ex.weight} ${escapeHtml(ex.unit || unit)}` : ''}
                    </span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            ${w.notes ? `<p class="stat-sub" style="padding-top:4px;">${escapeHtml(w.notes)}</p>` : ''}
          </article>
        `).join('')}
      </section>
    </div>
  `;

  function drawChart() {
    const dates = chartRange === 'weekly' ? weekDates : monthDates;
    const labels = dates.map((d) => (chartRange === 'weekly' ? formatWeekdayShort(d) : formatShortDate(d)));
    const mins = dates.map((d) =>
      workouts.filter((w) => w.date === d).reduce((s, w) => s + (Number(w.durationMin) || 0), 0)
    );

    renderChart(container.querySelector('#workout-freq-chart'), 'workout-freq', {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Duration (min)',
            data: mins,
            backgroundColor: '#a3e635',
            borderRadius: 5,
          },
        ],
      },
      options: {
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  drawChart();

  container.querySelectorAll('[data-range]').forEach((btn) => {
    btn.addEventListener('click', () => {
      chartRange = btn.dataset.range;
      container.querySelectorAll('[data-range]').forEach((b) => b.classList.toggle('active', b === btn));
      drawChart();
    });
  });

  const openWorkoutForm = (existing = null) => {
    const initialExercises = existing?.exercises?.length
      ? existing.exercises
      : [{ name: EXERCISES[0].name, sets: 3, reps: 10, weight: '' }];

    let rows = initialExercises.map((e) => ({ ...e }));

    const renderForm = () => `
      <form id="workout-form" class="form-grid" novalidate>
        <div class="field">
          <label for="wf-name">Workout Name</label>
          <input id="wf-name" class="input" type="text" value="${escapeHtml(existing?.name || '')}" placeholder="e.g., Full-Body Strength" required />
        </div>
        <div class="grid-2">
          <div class="field">
            <label for="wf-date">Date</label>
            <input id="wf-date" class="input" type="date" value="${escapeHtml(existing?.date || toLocalDateString())}" required />
          </div>
          <div class="field">
            <label for="wf-duration">Duration (min)</label>
            <input id="wf-duration" class="input" type="number" min="1" max="600" value="${existing?.durationMin ?? 30}" required />
          </div>
        </div>

        <div class="stack-sm">
          <div class="row-between">
            <label style="font-size:0.84rem;font-weight:600;color:var(--text-secondary);">Exercises</label>
            <button type="button" class="btn btn-secondary btn-sm" id="wf-add-ex">+ Add Exercise</button>
          </div>
          <div id="wf-ex-list" class="stack-sm"></div>
        </div>

        <div class="field">
          <label for="wf-notes">Notes (optional)</label>
          <textarea id="wf-notes" class="textarea" placeholder="How did it feel?">${escapeHtml(existing?.notes || '')}</textarea>
        </div>

        <div id="wf-error" class="field-error" role="alert"></div>
        <button type="submit" class="btn btn-primary btn-block">${existing ? 'Save Changes' : 'Save Workout'}</button>
      </form>
    `;

    openModal(existing ? 'Edit Workout' : 'Log Workout', renderForm(), (modalBody) => {
      const exListEl = modalBody.querySelector('#wf-ex-list');

      const renderRows = () => {
        exListEl.innerHTML = rows.map((row, idx) => `
          <div class="card" style="padding:10px;background:var(--bg-card);">
            <div class="stack-xs">
              <div class="row-between">
                <select class="select" data-ex-select="${idx}" aria-label="Exercise name">
                  ${EXERCISES.map((ex) => `<option value="${escapeHtml(ex.name)}" ${row.name === ex.name ? 'selected' : ''}>${escapeHtml(ex.name)}</option>`).join('')}
                  ${!EXERCISES.some((ex) => ex.name === row.name) && row.name ? `<option value="${escapeHtml(row.name)}" selected>${escapeHtml(row.name)}</option>` : ''}
                </select>
                ${rows.length > 1 ? `<button type="button" class="btn btn-danger btn-sm" data-ex-del="${idx}">Remove</button>` : ''}
              </div>
              <div class="grid-3">
                <div class="field">
                  <label>Sets</label>
                  <input class="input" type="number" min="1" max="50" data-ex-sets="${idx}" value="${row.sets ?? 3}" />
                </div>
                <div class="field">
                  <label>Reps</label>
                  <input class="input" type="number" min="1" max="500" data-ex-reps="${idx}" value="${row.reps ?? 10}" />
                </div>
                <div class="field">
                  <label>Weight (${unit})</label>
                  <input class="input" type="number" min="0" step="0.5" data-ex-weight="${idx}" value="${row.weight ?? ''}" placeholder="0" />
                </div>
              </div>
            </div>
          </div>
        `).join('');

        exListEl.querySelectorAll('[data-ex-select]').forEach((el) => {
          el.addEventListener('change', (e) => { rows[Number(el.dataset.exSelect)].name = e.target.value; });
        });
        exListEl.querySelectorAll('[data-ex-sets]').forEach((el) => {
          el.addEventListener('input', (e) => { rows[Number(el.dataset.exSets)].sets = Number(e.target.value); });
        });
        exListEl.querySelectorAll('[data-ex-reps]').forEach((el) => {
          el.addEventListener('input', (e) => { rows[Number(el.dataset.exReps)].reps = Number(e.target.value); });
        });
        exListEl.querySelectorAll('[data-ex-weight]').forEach((el) => {
          el.addEventListener('input', (e) => { rows[Number(el.dataset.exWeight)].weight = e.target.value; });
        });
        exListEl.querySelectorAll('[data-ex-del]').forEach((el) => {
          el.addEventListener('click', () => {
            rows.splice(Number(el.dataset.exDel), 1);
            renderRows();
          });
        });
      };

      renderRows();

      modalBody.querySelector('#wf-add-ex').addEventListener('click', () => {
        rows.push({ name: EXERCISES[0].name, sets: 3, reps: 10, weight: '' });
        renderRows();
      });

      modalBody.querySelector('#workout-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = modalBody.querySelector('#wf-name').value.trim();
        const date = modalBody.querySelector('#wf-date').value;
        const durationMin = Number(modalBody.querySelector('#wf-duration').value);
        const notes = modalBody.querySelector('#wf-notes').value.trim();
        const errEl = modalBody.querySelector('#wf-error');

        const err =
          validateNonEmptyText(name, 'Workout Name') ||
          validateDateString(date) ||
          validatePositiveNumber(durationMin, 'Duration', { min: 1, max: 600 });

        if (err) {
          errEl.textContent = err;
          return;
        }

        const cleanExercises = rows.map((r) => ({
          name: r.name,
          sets: Math.max(1, Number(r.sets) || 1),
          reps: Math.max(1, Number(r.reps) || 1),
          weight: r.weight !== '' ? Number(r.weight) : '',
          unit,
        }));

        await putItem('workouts', {
          id: existing?.id || generateId('wrk'),
          name,
          date,
          durationMin,
          exercises: cleanExercises,
          notes,
          createdAt: existing?.createdAt || Date.now(),
          updatedAt: Date.now(),
        });

        closeModal();
        showToast(existing ? 'Workout updated' : 'Workout logged');
        renderWorkouts(container);
      });
    });
  };

  container.querySelector('#btn-new-workout').addEventListener('click', () => openWorkoutForm(null));

  container.querySelectorAll('[data-edit-workout]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = workouts.find((w) => w.id === btn.dataset.editWorkout);
      if (target) openWorkoutForm(target);
    });
  });

  container.querySelectorAll('[data-del-workout]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteItem('workouts', btn.dataset.delWorkout);
      showToast('Workout deleted');
      renderWorkouts(container);
    });
  });
}
