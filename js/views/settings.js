/**
 * Settings & Data Management View — Units, JSON Backup Export/Import, Clear Data, iPhone Install Guide.
 */

import {
  getById,
  putItem,
  exportAllData,
  importAllData,
  clearAllUserData,
} from '../db/indexeddb.js';
import { toLocalDateString } from '../utils/date.js';
import { showToast } from '../utils/ui.js';

export async function renderSettings(container) {
  const profile = await getById('profile', 'user');
  const unit = profile?.preferredUnit || 'kg';

  container.innerHTML = `
    <div class="stack-lg view-enter">
      <div>
        <h1>Settings &amp; Backup</h1>
        <p class="stat-sub">Manage units, local backups, and iPhone installation</p>
      </div>

      <section class="card stack-sm">
        <h2>Measurement Units</h2>
        <div class="row-between">
          <span class="stat-sub">Weight display &amp; input unit</span>
          <div class="segmented" style="width: 130px;">
            <button type="button" class="${unit === 'kg' ? 'active' : ''}" data-set-unit="kg">kg</button>
            <button type="button" class="${unit === 'lbs' ? 'active' : ''}" data-set-unit="lbs">lbs</button>
          </div>
        </div>
      </section>

      <section class="card stack-sm">
        <h2>Local Data &amp; Sync Notice</h2>
        <p class="stat-sub">
          All your workouts, weights, meals, and water logs are stored privately on this device using IndexedDB.
          <strong>Local data does not automatically synchronize between devices.</strong>
          Export a JSON backup regularly to keep a copy or move data to another device.
        </p>

        <div class="stack-sm" style="margin-top:6px;">
          <button class="btn btn-primary btn-block" type="button" id="btn-export-json">Export JSON Backup</button>

          <label class="btn btn-secondary btn-block" for="import-json-input" style="cursor:pointer;">
            Import JSON Backup
            <input id="import-json-input" type="file" accept="application/json,.json" class="sr-only" />
          </label>
        </div>
        <div id="backup-status" class="field-error" role="alert"></div>
      </section>

      <section class="card stack-sm">
        <h2>Install on iPhone (Safari)</h2>
        <ol style="margin:0;padding-left:20px;color:var(--text-secondary);font-size:0.9rem;display:grid;gap:6px;">
          <li>Open your FITTRACK HTTPS URL in <strong>Safari</strong> on iPhone.</li>
          <li>Tap the <strong>Share</strong> icon (square with an upward arrow) at the bottom of Safari.</li>
          <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
          <li>Tap <strong>Add</strong> in the top-right corner. FITTRACK will launch full-screen like a native app.</li>
        </ol>
      </section>

      <section class="card stack-sm">
        <h2 class="text-danger">Danger Zone</h2>
        <p class="stat-sub">Permanently erase all workouts, weight logs, foods, water, and profile settings on this device.</p>
        <button class="btn btn-danger btn-block" type="button" id="btn-clear-all">Erase All Local Data</button>
      </section>
    </div>
  `;

  container.querySelectorAll('[data-set-unit]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await putItem('profile', { ...profile, preferredUnit: btn.dataset.setUnit, updatedAt: Date.now() });
      showToast(`Unit switched to ${btn.dataset.setUnit}`);
      renderSettings(container);
    });
  });

  container.querySelector('#btn-export-json').addEventListener('click', async () => {
    try {
      const payload = await exportAllData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fittrack-backup-${toLocalDateString()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Backup exported');
    } catch (err) {
      showToast(err.message || 'Export failed', 'error');
    }
  });

  container.querySelector('#import-json-input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    const statusEl = container.querySelector('#backup-status');
    statusEl.textContent = '';
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await importAllData(parsed);
      showToast('Backup restored successfully');
      renderSettings(container);
    } catch (err) {
      statusEl.textContent = err.message || 'Invalid backup JSON file.';
      showToast('Backup import failed', 'error');
    }
  });

  container.querySelector('#btn-clear-all').addEventListener('click', async () => {
    const confirmed = window.confirm(
      'Are you sure you want to erase all local FITTRACK data? Export a backup first if you want to keep your history.'
    );
    if (!confirmed) return;
    await clearAllUserData();
    showToast('All local data erased');
    renderSettings(container);
  });
}
