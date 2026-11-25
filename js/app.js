/**
 * FITTRACK Main Application Entry Point
 */

import { ensureDefaults } from './db/indexeddb.js';
import { destroyAllCharts, closeModal } from './utils/ui.js';
import { renderDashboard } from './views/dashboard.js';
import { renderWorkouts } from './views/workouts.js';
import { renderWeight } from './views/weight.js';
import { renderNutrition } from './views/nutrition.js';
import { renderWater } from './views/water.js';
import { renderExercises } from './views/exercises.js';
import { renderPlans } from './views/plans.js';
import { renderTimer } from './views/timer.js';
import { renderProfile } from './views/profile.js';
import { renderSettings } from './views/settings.js';

const ROUTES = {
  dashboard: { title: 'Dashboard', render: renderDashboard, tab: 'dashboard' },
  workouts: { title: 'Workouts', render: renderWorkouts, tab: 'workouts' },
  nutrition: { title: 'Nutrition', render: renderNutrition, tab: 'nutrition' },
  water: { title: 'Water Tracker', render: renderWater, tab: 'water' },
  weight: { title: 'Weight Tracker', render: renderWeight, tab: 'more' },
  exercises: { title: 'Exercise Library', render: renderExercises, tab: 'more' },
  plans: { title: 'Workout Plans', render: renderPlans, tab: 'more' },
  timer: { title: 'Rest Timer', render: renderTimer, tab: 'more' },
  profile: { title: 'Profile & Goals', render: renderProfile, tab: 'more' },
  settings: { title: 'Settings & Backup', render: renderSettings, tab: 'more' },
};

let currentRoute = 'dashboard';

const mainEl = document.getElementById('app-main');
const headerSubtitleEl = document.getElementById('header-view-title');
const moreSheetEl = document.getElementById('more-sheet');
const moreMenuBtn = document.getElementById('more-menu-btn');
const offlinePill = document.getElementById('offline-pill');

function openMoreSheet() {
  moreSheetEl.classList.add('open');
  moreMenuBtn.setAttribute('aria-expanded', 'true');
}

function closeMoreSheet() {
  moreSheetEl.classList.remove('open');
  moreMenuBtn.setAttribute('aria-expanded', 'false');
}

function updateNavHighlight(routeKey) {
  const activeTab = ROUTES[routeKey]?.tab || 'dashboard';

  document.querySelectorAll('.nav-tab[data-nav]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.nav === activeTab);
  });
  moreMenuBtn.classList.toggle('active', activeTab === 'more');

  document.querySelectorAll('.sheet-item[data-nav]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.nav === routeKey);
  });
}

async function navigate(routeKey) {
  const key = ROUTES[routeKey] ? routeKey : 'dashboard';
  currentRoute = key;
  closeMoreSheet();
  closeModal();
  destroyAllCharts();

  const route = ROUTES[key];
  headerSubtitleEl.textContent = route.title;
  updateNavHighlight(key);

  if (window.location.hash !== `#${key}`) {
    window.history.replaceState(null, '', `#${key}`);
  }

  await route.render(mainEl, { navigate });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function updateOnlineStatus() {
  offlinePill.classList.toggle('visible', !navigator.onLine);
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js');
  } catch (err) {
    console.warn('Service worker registration skipped:', err);
  }
}

async function init() {
  await ensureDefaults();

  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.addEventListener('click', () => navigate(el.dataset.nav));
  });

  moreMenuBtn.addEventListener('click', openMoreSheet);
  document.getElementById('close-more-sheet').addEventListener('click', closeMoreSheet);
  moreSheetEl.addEventListener('click', (e) => {
    if (e.target === moreSheetEl) closeMoreSheet();
  });

  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') closeModal();
  });

  window.addEventListener('hashchange', () => {
    const hashRoute = window.location.hash.replace('#', '');
    if (hashRoute && ROUTES[hashRoute] && hashRoute !== currentRoute) {
      navigate(hashRoute);
    }
  });

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  await registerServiceWorker();

  const initialRoute = window.location.hash.replace('#', '') || 'dashboard';
  await navigate(initialRoute);
}

init().catch((err) => {
  console.error('FITTRACK failed to initialize:', err);
  mainEl.innerHTML = `
    <div class="card">
      <h2>Unable to start FITTRACK</h2>
      <p class="stat-sub">Please ensure IndexedDB is enabled in your browser and reload the page.</p>
    </div>
  `;
});
