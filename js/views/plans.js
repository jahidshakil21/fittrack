/**
 * Workout Plans View — Weekly beginner-friendly home schedule, editable per day.
 */

import { getAll, putItem } from '../db/indexeddb.js';
import { DEFAULT_WORKOUT_PLAN } from '../data/workoutPlans.js';
import { getTodayWeekdayKey } from '../utils/date.js';
import { validateNonEmptyText, validatePositiveNumber } from '../utils/validation.js';
import { escapeHtml, openModal, closeModal, showToast } from '../utils/ui.js';

export async function renderPlans(container) {
  const plans = await getAll('workoutPlans');
  const plan = plans[0] || DEFAULT_WORKOUT_PLAN;
  const todayKey = getTodayWeekdayKey();

  container.innerHTML = `
    <div class="stack-lg view-enter">
      <div class="section-header">
        <div>
          <h1>Workout Plans</h1>
          <p class="stat-sub">${escapeHtml(plan.name)}</p>
        </div>
        <button class="btn btn-ghost btn-sm" type="button" id="btn-reset-plan">Reset Default</button>
      </div>

      <section class="stack-sm">
        ${plan.schedule.map((day, idx) => {
          const isToday = day.day === todayKey;
          const badgeClass =
            day.type === 'Strength' ? 'pill-accent' : day.type === 'Cardio' ? 'pill-calories' : '';
          return `
            <article class="card ${isToday ? 'card-accent' : ''} stack-xs">
              <div class="row-between">
                <div class="row">
                  <h3>${escapeHtml(day.label)}</h3>
                  ${isToday ? '<span class="pill pill-accent">Today</span>' : ''}
                </div>
                <span class="pill ${badgeClass}">${escapeHtml(day.type)}</span>
              </div>
              <div style="font-weight:700;font-size:1.02rem;">${escapeHtml(day.title)}</div>
              <div class="stat-sub">${day.durationMin > 0 ? `Recommended duration: ${day.durationMin} min` : 'Rest & recovery'}</div>
              ${day.exercises?.length ? `
                <div class="row-wrap" style="margin-top:4px;">
                  ${day.exercises.map((ex) => `<span class="pill">${escapeHtml(ex)}</span>`).join('')}
                </div>
              ` : ''}
              ${day.recoveryNote ? `<p class="stat-sub" style="margin-top:4px;"><em>Recovery:</em> ${escapeHtml(day.recoveryNote)}</p>` : ''}
              <div style="margin-top:6px;">
                <button class="btn btn-secondary btn-sm" type="button" data-edit-day="${idx}">Customize Day</button>
              </div>
            </article>
          `;
        }).join('')}
      </section>
    </div>
  `;

  container.querySelector('#btn-reset-plan').addEventListener('click', async () => {
    await putItem('workoutPlans', { ...DEFAULT_WORKOUT_PLAN, updatedAt: Date.now() });
    showToast('Workout plan reset to beginner default');
    renderPlans(container);
  });

  container.querySelectorAll('[data-edit-day]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.editDay);
      const day = plan.schedule[idx];
      if (!day) return;

      openModal(
        `Customize ${day.label}`,
        `
          <form id="edit-plan-form" class="form-grid" novalidate>
            <div class="field">
              <label for="ep-title">Session Title</label>
              <input id="ep-title" class="input" type="text" value="${escapeHtml(day.title)}" required />
            </div>
            <div class="grid-2">
              <div class="field">
                <label for="ep-type">Type</label>
                <select id="ep-type" class="select">
                  <option value="Strength" ${day.type === 'Strength' ? 'selected' : ''}>Strength</option>
                  <option value="Cardio" ${day.type === 'Cardio' ? 'selected' : ''}>Cardio</option>
                  <option value="Rest" ${day.type === 'Rest' ? 'selected' : ''}>Rest</option>
                </select>
              </div>
              <div class="field">
                <label for="ep-dur">Duration (min)</label>
                <input id="ep-dur" class="input" type="number" min="0" max="300" value="${day.durationMin}" />
              </div>
            </div>
            <div class="field">
              <label for="ep-ex">Exercises (comma-separated)</label>
              <textarea id="ep-ex" class="textarea" placeholder="Bodyweight Squat, Incline Push-Up">${escapeHtml((day.exercises || []).join(', '))}</textarea>
            </div>
            <div class="field">
              <label for="ep-rec">Recovery Guidance</label>
              <textarea id="ep-rec" class="textarea">${escapeHtml(day.recoveryNote || '')}</textarea>
            </div>
            <div id="ep-error" class="field-error"></div>
            <button type="submit" class="btn btn-primary btn-block">Save Day</button>
          </form>
        `,
        (modalBody) => {
          modalBody.querySelector('#edit-plan-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = modalBody.querySelector('#ep-title').value.trim();
            const type = modalBody.querySelector('#ep-type').value;
            const durationMin = Number(modalBody.querySelector('#ep-dur').value || 0);
            const exRaw = modalBody.querySelector('#ep-ex').value;
            const recoveryNote = modalBody.querySelector('#ep-rec').value.trim();

            const err =
              validateNonEmptyText(title, 'Session Title') ||
              validatePositiveNumber(durationMin, 'Duration', { min: 0, max: 300 });
            if (err) {
              modalBody.querySelector('#ep-error').textContent = err;
              return;
            }

            const exercises = exRaw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);

            const nextSchedule = plan.schedule.map((item, i) =>
              i === idx ? { ...item, title, type, durationMin, exercises, recoveryNote } : item
            );

            await putItem('workoutPlans', {
              ...plan,
              isCustom: true,
              schedule: nextSchedule,
              updatedAt: Date.now(),
            });

            closeModal();
            showToast(`${day.label} updated`);
            renderPlans(container);
          });
        }
      );
    });
  });
}
