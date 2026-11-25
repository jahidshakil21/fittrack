/**
 * Exercise Library View — Beginner-friendly exercises across 6 categories.
 */

import { EXERCISES, EXERCISE_CATEGORIES } from '../data/exercises.js';
import { escapeHtml, openModal } from '../utils/ui.js';

export async function renderExercises(container, state = {}) {
  let selectedCat = state.exCategory || 'All';
  let query = state.exQuery || '';

  const filtered = EXERCISES.filter((ex) => {
    const matchCat = selectedCat === 'All' || ex.category === selectedCat;
    const q = query.trim().toLowerCase();
    const matchQ =
      !q ||
      ex.name.toLowerCase().includes(q) ||
      ex.muscles.toLowerCase().includes(q) ||
      ex.category.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  container.innerHTML = `
    <div class="stack-lg view-enter">
      <div>
        <h1>Exercise Library</h1>
        <p class="stat-sub">Beginner-friendly movements with form &amp; safety tips</p>
      </div>

      <div class="field">
        <label for="ex-search" class="sr-only">Search exercises</label>
        <input id="ex-search" class="input" type="search" value="${escapeHtml(query)}" placeholder="Search by name or muscle (e.g., squat, glutes)..." />
      </div>

      <div class="chip-row" role="tablist" aria-label="Exercise Categories">
        <button type="button" class="chip ${selectedCat === 'All' ? 'active' : ''}" data-cat="All">All</button>
        ${EXERCISE_CATEGORIES.map((cat) => `
          <button type="button" class="chip ${selectedCat === cat ? 'active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>
        `).join('')}
      </div>

      <section class="stack-sm">
        ${filtered.length === 0 ? `
          <div class="empty-state">No exercises match "${escapeHtml(query)}".</div>
        ` : filtered.map((ex) => `
          <article class="card stack-xs" data-ex-id="${ex.id}" style="cursor:pointer;">
            <div class="row-between">
              <h3>${escapeHtml(ex.name)}</h3>
              <span class="pill pill-accent">${escapeHtml(ex.category)}</span>
            </div>
            <div class="stat-sub"><strong>Targets:</strong> ${escapeHtml(ex.muscles)}</div>
            <div class="row-between" style="margin-top:4px;">
              <span class="pill">${escapeHtml(ex.difficulty)}</span>
              <span class="stat-sub">${escapeHtml(ex.recommended)}</span>
            </div>
          </article>
        `).join('')}
      </section>
    </div>
  `;

  container.querySelector('#ex-search').addEventListener('input', (e) => {
    renderExercises(container, { exCategory: selectedCat, exQuery: e.target.value });
  });

  container.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      renderExercises(container, { exCategory: btn.dataset.cat, exQuery: query });
    });
  });

  container.querySelectorAll('[data-ex-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const ex = EXERCISES.find((item) => item.id === card.dataset.exId);
      if (!ex) return;
      openModal(
        ex.name,
        `
          <div class="stack-md">
            <div class="row-wrap">
              <span class="pill pill-accent">${escapeHtml(ex.category)}</span>
              <span class="pill">${escapeHtml(ex.difficulty)}</span>
              <span class="pill">${escapeHtml(ex.recommended)}</span>
            </div>
            <div>
              <span class="stat-label">Target Muscles</span>
              <p>${escapeHtml(ex.muscles)}</p>
            </div>
            <div>
              <span class="stat-label">Instructions</span>
              <p>${escapeHtml(ex.instructions)}</p>
            </div>
            <div class="notice-box">
              <strong>Safety Tip:</strong> ${escapeHtml(ex.safety)}
            </div>
          </div>
        `
      );
    });
  });
}
