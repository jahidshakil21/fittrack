/**
 * Nutrition View — Calorie Tracker + Meal Planner in a clean segmented interface.
 * Never invents nutritional values; all calorie values are user-entered.
 */

import { getAll, getById, putItem, deleteItem } from '../db/indexeddb.js';
import { sumByDate } from '../utils/calculations.js';
import { toLocalDateString, getPastDates, formatWeekdayShort, generateId } from '../utils/date.js';
import { validateNonEmptyText, validatePositiveNumber, validateDateString } from '../utils/validation.js';
import { escapeHtml, openModal, closeModal, renderChart, showToast } from '../utils/ui.js';

const MEAL_CATEGORIES = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snacks' },
];

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
  { key: 'idea', label: 'Saved Meal Ideas' },
];

export async function renderNutrition(container, state = {}) {
  let activeTab = state.nutritionTab || 'calories';
  let selectedDate = state.nutritionDate || toLocalDateString();

  const [profile, foods, mealPlans] = await Promise.all([
    getById('profile', 'user'),
    getAll('foods'),
    getAll('mealPlans'),
  ]);

  const target = Number(profile?.dailyCalorieTarget) || 2000;
  const dayFoods = foods.filter((f) => f.date === selectedDate);
  const dayTotal = sumByDate(foods, selectedDate, 'calories');
  const pct = Math.min(100, Math.round((dayTotal / target) * 100));

  const weekDates = getPastDates(7);
  const weekAvg = Math.round(
    weekDates.reduce((s, d) => s + sumByDate(foods, d, 'calories'), 0) / 7
  );

  container.innerHTML = `
    <div class="stack-lg view-enter">
      <div class="section-header">
        <div>
          <h1>Nutrition</h1>
          <p class="stat-sub">Manual calorie logging &amp; meal planning</p>
        </div>
      </div>

      <div class="segmented">
        <button type="button" class="${activeTab === 'calories' ? 'active' : ''}" data-ntab="calories">Calorie Tracker</button>
        <button type="button" class="${activeTab === 'planner' ? 'active' : ''}" data-ntab="planner">Meal Planner</button>
      </div>

      ${activeTab === 'calories' ? `
        <section class="card stack-sm">
          <div class="row-between">
            <div>
              <span class="stat-label">Daily Intake</span>
              <div class="stat-value tabular-nums">${dayTotal} <span class="stat-sub">/ ${target} kcal</span></div>
            </div>
            <input type="date" id="nut-date" class="input" style="width:auto;" value="${selectedDate}" aria-label="Select date" />
          </div>
          <div class="progress-track">
            <div class="progress-fill ${dayTotal > target ? 'danger' : 'calories'}" style="width:${pct}%"></div>
          </div>
          <div class="row-between stat-sub">
            <span>Remaining: ${Math.max(0, target - dayTotal)} kcal</span>
            <span>7-day avg: ${weekAvg} kcal/day</span>
          </div>
        </section>

        <section class="card stack-sm">
          <div class="row-between">
            <h2>Add Food Entry</h2>
            <span class="pill">User-entered values</span>
          </div>
          <form id="food-form" class="form-grid" novalidate>
            <div class="field">
              <label for="fd-name">Food / Meal Name</label>
              <input id="fd-name" class="input" type="text" placeholder="e.g., Oatmeal with berries" required />
            </div>
            <div class="grid-2">
              <div class="field">
                <label for="fd-cal">Calories (kcal)</label>
                <input id="fd-cal" class="input" type="number" min="1" max="10000" placeholder="350" required />
              </div>
              <div class="field">
                <label for="fd-meal">Category</label>
                <select id="fd-meal" class="select">
                  ${MEAL_CATEGORIES.map((m) => `<option value="${m.key}">${m.label}</option>`).join('')}
                </select>
              </div>
            </div>
            <div id="fd-error" class="field-error" role="alert"></div>
            <button type="submit" class="btn btn-primary btn-block">+ Add Food</button>
          </form>
        </section>

        <section class="stack-sm">
          <h2>Meals for ${selectedDate}</h2>
          ${MEAL_CATEGORIES.map((cat) => {
            const items = dayFoods.filter((f) => f.meal === cat.key);
            const catSum = items.reduce((s, f) => s + Number(f.calories || 0), 0);
            return `
              <div class="card stack-xs">
                <div class="row-between">
                  <h3>${cat.label}</h3>
                  <span class="pill pill-calories tabular-nums">${catSum} kcal</span>
                </div>
                ${items.length === 0 ? `<p class="stat-sub">No entries</p>` : items.map((item) => `
                  <div class="list-item">
                    <div>
                      <strong>${escapeHtml(item.name)}</strong>
                      <div class="stat-sub tabular-nums">${item.calories} kcal</div>
                    </div>
                    <div class="row">
                      <button class="btn btn-ghost btn-sm" type="button" data-edit-food="${item.id}">Edit</button>
                      <button class="btn btn-danger btn-sm" type="button" data-del-food="${item.id}">Delete</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `;
          }).join('')}
        </section>

        <section class="card stack-sm">
          <h2>7-Day Calorie Summary</h2>
          <div class="chart-wrap">
            <canvas id="calorie-week-chart"></canvas>
          </div>
        </section>
      ` : `
        <section class="card stack-sm">
          <div class="row-between">
            <div>
              <h2>Meal Schedule &amp; Ideas</h2>
              <p class="stat-sub">Plan daily meals or save reusable ideas</p>
            </div>
            <button class="btn btn-primary btn-sm" type="button" id="btn-add-meal-plan">+ Add Meal</button>
          </div>
        </section>

        <section class="stack-sm">
          ${DAYS.map((d) => {
            const items = mealPlans.filter((mp) => mp.day === d.key);
            const estTotal = items.reduce((s, mp) => s + (Number(mp.estimatedCalories) || 0), 0);
            return `
              <div class="card stack-xs">
                <div class="row-between">
                  <h3>${d.label}</h3>
                  ${items.length ? `<span class="pill pill-calories tabular-nums">~${estTotal} kcal</span>` : ''}
                </div>
                ${items.length === 0 ? `<p class="stat-sub">Nothing planned</p>` : items.map((mp) => `
                  <div class="list-item">
                    <div>
                      <span class="pill" style="margin-bottom:4px;">${escapeHtml(mp.meal)}</span>
                      <div><strong>${escapeHtml(mp.title)}</strong></div>
                      ${mp.estimatedCalories ? `<div class="stat-sub tabular-nums">Est. ${mp.estimatedCalories} kcal</div>` : ''}
                      ${mp.notes ? `<div class="stat-sub">${escapeHtml(mp.notes)}</div>` : ''}
                    </div>
                    <div class="row">
                      <button class="btn btn-ghost btn-sm" type="button" data-edit-mp="${mp.id}">Edit</button>
                      <button class="btn btn-danger btn-sm" type="button" data-del-mp="${mp.id}">Delete</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `;
          }).join('')}
        </section>
      `}
    </div>
  `;

  container.querySelectorAll('[data-ntab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      renderNutrition(container, { nutritionTab: btn.dataset.ntab, nutritionDate: selectedDate });
    });
  });

  if (activeTab === 'calories') {
    container.querySelector('#nut-date').addEventListener('change', (e) => {
      renderNutrition(container, { nutritionTab: 'calories', nutritionDate: e.target.value });
    });

    container.querySelector('#food-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = container.querySelector('#fd-name').value.trim();
      const calories = Number(container.querySelector('#fd-cal').value);
      const meal = container.querySelector('#fd-meal').value;
      const errEl = container.querySelector('#fd-error');

      const err =
        validateNonEmptyText(name, 'Food name') ||
        validatePositiveNumber(calories, 'Calories', { min: 1, max: 10000 }) ||
        validateDateString(selectedDate);

      if (err) {
        errEl.textContent = err;
        return;
      }

      await putItem('foods', {
        id: generateId('food'),
        date: selectedDate,
        name,
        calories: Math.round(calories),
        meal,
        createdAt: Date.now(),
      });

      showToast('Food entry added');
      renderNutrition(container, { nutritionTab: 'calories', nutritionDate: selectedDate });
    });

    container.querySelectorAll('[data-del-food]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await deleteItem('foods', btn.dataset.delFood);
        showToast('Entry deleted');
        renderNutrition(container, { nutritionTab: 'calories', nutritionDate: selectedDate });
      });
    });

    container.querySelectorAll('[data-edit-food]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = foods.find((f) => f.id === btn.dataset.editFood);
        if (!item) return;
        openModal(
          'Edit Food Entry',
          `
            <form id="edit-food-form" class="form-grid" novalidate>
              <div class="field">
                <label for="ef-name">Food Name</label>
                <input id="ef-name" class="input" type="text" value="${escapeHtml(item.name)}" required />
              </div>
              <div class="grid-2">
                <div class="field">
                  <label for="ef-cal">Calories (kcal)</label>
                  <input id="ef-cal" class="input" type="number" value="${item.calories}" required />
                </div>
                <div class="field">
                  <label for="ef-meal">Category</label>
                  <select id="ef-meal" class="select">
                    ${MEAL_CATEGORIES.map((m) => `<option value="${m.key}" ${item.meal === m.key ? 'selected' : ''}>${m.label}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div id="ef-error" class="field-error"></div>
              <button type="submit" class="btn btn-primary btn-block">Save Changes</button>
            </form>
          `,
          (modalBody) => {
            modalBody.querySelector('#edit-food-form').addEventListener('submit', async (e) => {
              e.preventDefault();
              const name = modalBody.querySelector('#ef-name').value.trim();
              const calories = Number(modalBody.querySelector('#ef-cal').value);
              const meal = modalBody.querySelector('#ef-meal').value;
              const err =
                validateNonEmptyText(name, 'Food name') ||
                validatePositiveNumber(calories, 'Calories', { min: 1, max: 10000 });
              if (err) {
                modalBody.querySelector('#ef-error').textContent = err;
                return;
              }
              await putItem('foods', { ...item, name, calories: Math.round(calories), meal });
              closeModal();
              showToast('Food entry updated');
              renderNutrition(container, { nutritionTab: 'calories', nutritionDate: selectedDate });
            });
          }
        );
      });
    });

    renderChart(container.querySelector('#calorie-week-chart'), 'cal-week', {
      type: 'bar',
      data: {
        labels: weekDates.map((d) => formatWeekdayShort(d)),
        datasets: [
          {
            label: 'Calories (kcal)',
            data: weekDates.map((d) => sumByDate(foods, d, 'calories')),
            backgroundColor: '#fbbf24',
            borderRadius: 6,
          },
        ],
      },
      options: { scales: { y: { beginAtZero: true } } },
    });
  } else {
    const openMealPlanModal = (existing = null) => {
      openModal(
        existing ? 'Edit Meal Plan' : 'Add Planned Meal',
        `
          <form id="mp-form" class="form-grid" novalidate>
            <div class="grid-2">
              <div class="field">
                <label for="mp-day">Day / List</label>
                <select id="mp-day" class="select">
                  ${DAYS.map((d) => `<option value="${d.key}" ${(existing?.day || 'monday') === d.key ? 'selected' : ''}>${d.label}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="mp-meal">Meal</label>
                <select id="mp-meal" class="select">
                  ${MEAL_CATEGORIES.map((m) => `<option value="${m.key}" ${(existing?.meal || 'breakfast') === m.key ? 'selected' : ''}>${m.label}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="field">
              <label for="mp-title">Meal Idea</label>
              <input id="mp-title" class="input" type="text" value="${escapeHtml(existing?.title || '')}" placeholder="e.g., Grilled chicken salad" required />
            </div>
            <div class="field">
              <label for="mp-cal">Estimated Calories (optional)</label>
              <input id="mp-cal" class="input" type="number" min="0" max="10000" value="${existing?.estimatedCalories ?? ''}" placeholder="450" />
            </div>
            <div class="field">
              <label for="mp-notes">Notes (optional)</label>
              <textarea id="mp-notes" class="textarea" placeholder="Ingredients or prep tips">${escapeHtml(existing?.notes || '')}</textarea>
            </div>
            <div id="mp-error" class="field-error"></div>
            <button type="submit" class="btn btn-primary btn-block">${existing ? 'Save Meal' : 'Add to Plan'}</button>
          </form>
        `,
        (modalBody) => {
          modalBody.querySelector('#mp-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const day = modalBody.querySelector('#mp-day').value;
            const meal = modalBody.querySelector('#mp-meal').value;
            const title = modalBody.querySelector('#mp-title').value.trim();
            const calRaw = modalBody.querySelector('#mp-cal').value;
            const notes = modalBody.querySelector('#mp-notes').value.trim();

            const err =
              validateNonEmptyText(title, 'Meal idea') ||
              (calRaw !== '' ? validatePositiveNumber(calRaw, 'Estimated calories', { min: 1, max: 10000 }) : null);

            if (err) {
              modalBody.querySelector('#mp-error').textContent = err;
              return;
            }

            await putItem('mealPlans', {
              id: existing?.id || generateId('mp'),
              day,
              meal,
              title,
              estimatedCalories: calRaw !== '' ? Math.round(Number(calRaw)) : '',
              notes,
              createdAt: existing?.createdAt || Date.now(),
            });

            closeModal();
            showToast(existing ? 'Meal plan updated' : 'Meal added to plan');
            renderNutrition(container, { nutritionTab: 'planner', nutritionDate: selectedDate });
          });
        }
      );
    };

    container.querySelector('#btn-add-meal-plan').addEventListener('click', () => openMealPlanModal(null));
    container.querySelectorAll('[data-edit-mp]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = mealPlans.find((m) => m.id === btn.dataset.editMp);
        if (target) openMealPlanModal(target);
      });
    });
    container.querySelectorAll('[data-del-mp]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await deleteItem('mealPlans', btn.dataset.delMp);
        showToast('Planned meal deleted');
        renderNutrition(container, { nutritionTab: 'planner', nutritionDate: selectedDate });
      });
    });
  }
}
