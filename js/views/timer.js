/**
 * Rest Timer View — 30s, 60s, 90s, 120s, and custom countdown with sound/vibration alert.
 */

import { validatePositiveNumber } from '../utils/validation.js';
import {
  playTimerAlert,
  speakCountdownNumber,
  startTimerMusic,
  stopTimerMusic,
  listEnglishVoices,
  getSelectedVoiceURI,
  setSelectedVoiceURI,
  showToast,
} from '../utils/ui.js';

const timerState = {
  totalSeconds: 60,
  remainingSeconds: 60,
  leadInPhase: 'idle', // 'idle' | 'ready' | 'count' | 'start'
  leadInCount: 0,      // 1..5
  running: false,
  musicEnabled: true,
  intervalId: null,
  leadInTimeoutId: null,
};

function formatClock(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export async function renderTimer(container) {
  const radius = 92;
  const circumference = 2 * Math.PI * radius;

  container.innerHTML = `
    <div class="stack-lg view-enter">
      <div>
        <h1>Rest Timer</h1>
        <p class="stat-sub">Stay on pace between sets with audio &amp; vibration alerts</p>
      </div>

      <section class="card stack-lg" style="text-align:center;">
        <div class="timer-ring-wrap">
          <svg class="timer-ring-svg" width="220" height="220" viewBox="0 0 220 220" aria-hidden="true">
            <circle cx="110" cy="110" r="${radius}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10"></circle>
            <circle id="timer-progress-circle" cx="110" cy="110" r="${radius}" fill="none" stroke="#a3e635" stroke-width="10" stroke-linecap="round"
              stroke-dasharray="${circumference}" stroke-dashoffset="0"></circle>
          </svg>
          <div>
            <div id="timer-display" class="timer-time">${formatClock(timerState.remainingSeconds)}</div>
            <div id="timer-status" class="stat-sub">${timerState.running ? 'Resting...' : 'Ready'}</div>
          </div>
        </div>

        <div class="grid-2">
          <button class="btn btn-primary" type="button" id="timer-toggle">${timerState.running ? 'Pause' : 'Start'}</button>
          <button class="btn btn-secondary" type="button" id="timer-reset">Reset</button>
        </div>

        <div class="row-between" style="padding: 8px 12px; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <span class="stat-sub">Countdown Background Music</span>
          <button class="btn btn-sm ${timerState.musicEnabled ? 'btn-primary' : 'btn-ghost'}" type="button" id="timer-music-toggle">
            ${timerState.musicEnabled ? 'Music: On' : 'Music: Off'}
          </button>
        </div>

        <div class="field" style="text-align:left;">
          <label for="timer-voice-select">Coach Voice</label>
          <select id="timer-voice-select" class="select"></select>
        </div>

        <div class="stack-xs">
          <span class="stat-label">Quick Presets</span>
          <div class="row-wrap" style="justify-content:center;">
            ${[30, 60, 90, 120].map((sec) => `
              <button class="chip ${timerState.totalSeconds === sec ? 'active' : ''}" type="button" data-preset="${sec}">${sec}s</button>
            `).join('')}
          </div>
        </div>

        <form id="custom-timer-form" class="row" novalidate>
          <input id="custom-sec" class="input" type="number" min="5" max="3600" placeholder="Custom seconds (e.g., 45)" aria-label="Custom rest seconds" />
          <button class="btn btn-secondary" type="submit" style="flex-shrink:0;">Set</button>
        </form>
        <div id="timer-err" class="field-error" role="alert"></div>
      </section>
    </div>
  `;

  const displayEl = container.querySelector('#timer-display');
  const statusEl = container.querySelector('#timer-status');
  const toggleBtn = container.querySelector('#timer-toggle');
  const circleEl = container.querySelector('#timer-progress-circle');

  const updateVisual = () => {
    if (!document.body.contains(displayEl)) return;
    if (timerState.running && timerState.leadInPhase === 'ready') {
      displayEl.textContent = 'READY';
      statusEl.textContent = 'Get ready...';
    } else if (timerState.running && timerState.leadInPhase === 'count') {
      displayEl.textContent = `00:0${timerState.leadInCount}`;
      statusEl.textContent = `Ready... ${timerState.leadInCount} / 5`;
    } else if (timerState.running && timerState.leadInPhase === 'start') {
      displayEl.textContent = 'START!';
      statusEl.textContent = 'Starting timer...';
    } else {
      displayEl.textContent = formatClock(timerState.remainingSeconds);
      statusEl.textContent = timerState.running ? 'Counting down...' : (timerState.remainingSeconds === 0 ? 'Complete!' : 'Ready');
    }
    toggleBtn.textContent = timerState.running ? 'Pause' : 'Start';
    const ratio = timerState.totalSeconds > 0 ? timerState.remainingSeconds / timerState.totalSeconds : 0;
    circleEl.style.strokeDashoffset = String(circumference * (1 - ratio));
  };

  const stopInterval = () => {
    if (timerState.intervalId) {
      clearInterval(timerState.intervalId);
      timerState.intervalId = null;
    }
    if (timerState.leadInTimeoutId) {
      clearTimeout(timerState.leadInTimeoutId);
      timerState.leadInTimeoutId = null;
    }
    timerState.running = false;
    timerState.leadInPhase = 'idle';
    timerState.leadInCount = 0;
    stopTimerMusic();
  };

  const runFinalCountdown = (sec) => {
    if (!timerState.running) return;
    if (sec <= 0) {
      timerState.remainingSeconds = 0;
      stopInterval();
      playTimerAlert();
      showToast('Rest complete! Next set.');
      updateVisual();
      return;
    }

    speakCountdownNumber(sec, true, () => {
      if (!timerState.running) return;
      timerState.remainingSeconds = sec;
      updateVisual();
      timerState.leadInTimeoutId = setTimeout(() => runFinalCountdown(sec - 1), 950);
    });
  };

  const beginMainCountdown = () => {
    if (!timerState.running) return;
    timerState.leadInPhase = 'idle';
    timerState.leadInCount = 0;
    updateVisual();

    if (timerState.remainingSeconds <= 5) {
      runFinalCountdown(timerState.remainingSeconds);
      return;
    }

    timerState.intervalId = setInterval(() => {
      const nextRemaining = timerState.remainingSeconds - 1;

      if (nextRemaining <= 5) {
        clearInterval(timerState.intervalId);
        timerState.intervalId = null;
        runFinalCountdown(nextRemaining);
      } else {
        timerState.remainingSeconds = nextRemaining;
        updateVisual();
      }
    }, 1000);
  };

  const runLeadInStep = (phase, count = 0) => {
    if (!timerState.running) return;
    timerState.leadInPhase = phase;
    timerState.leadInCount = count;

    if (phase === 'ready') {
      speakCountdownNumber('Ready', false, () => {
        if (!timerState.running) return;
        updateVisual();
        timerState.leadInTimeoutId = setTimeout(() => runLeadInStep('count', 1), 900);
      });
    } else if (phase === 'count') {
      speakCountdownNumber(count, false, () => {
        if (!timerState.running) return;
        updateVisual();
        if (count < 5) {
          timerState.leadInTimeoutId = setTimeout(() => runLeadInStep('count', count + 1), 950);
        } else {
          timerState.leadInTimeoutId = setTimeout(() => runLeadInStep('start', 0), 950);
        }
      });
    } else if (phase === 'start') {
      speakCountdownNumber('Start', true, () => {
        if (!timerState.running) return;
        updateVisual();
        timerState.leadInTimeoutId = setTimeout(beginMainCountdown, 800);
      });
    }
  };

  const startCountdown = () => {
    if (timerState.remainingSeconds <= 0) {
      timerState.remainingSeconds = timerState.totalSeconds;
    }
    timerState.running = true;
    if (timerState.musicEnabled) {
      startTimerMusic();
    }
    runLeadInStep('ready', 0);
  };

  updateVisual();

  const musicToggleBtn = container.querySelector('#timer-music-toggle');
  musicToggleBtn.addEventListener('click', () => {
    timerState.musicEnabled = !timerState.musicEnabled;
    musicToggleBtn.textContent = timerState.musicEnabled ? 'Music: On' : 'Music: Off';
    musicToggleBtn.className = `btn btn-sm ${timerState.musicEnabled ? 'btn-primary' : 'btn-ghost'}`;
    if (!timerState.musicEnabled) {
      stopTimerMusic();
    } else if (timerState.running) {
      startTimerMusic();
    }
  });

  const voiceSelectEl = container.querySelector('#timer-voice-select');
  const populateVoices = () => {
    const voices = listEnglishVoices();
    const currentURI = getSelectedVoiceURI();
    if (!voices.length) {
      voiceSelectEl.innerHTML = '<option value="">Default System Voice</option>';
      return;
    }
    voiceSelectEl.innerHTML = voices
      .map((v, idx) => {
        const isSel = currentURI ? v.voiceURI === currentURI : idx === 0;
        return `<option value="${v.voiceURI}" ${isSel ? 'selected' : ''}>${v.name} (${v.lang})</option>`;
      })
      .join('');
  };
  populateVoices();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }
  voiceSelectEl.addEventListener('change', (e) => {
    setSelectedVoiceURI(e.target.value);
    speakCountdownNumber('Ready', false);
  });

  toggleBtn.addEventListener('click', () => {
    if (timerState.running) {
      stopInterval();
      updateVisual();
    } else {
      startCountdown();
    }
  });

  container.querySelector('#timer-reset').addEventListener('click', () => {
    stopInterval();
    timerState.remainingSeconds = timerState.totalSeconds;
    updateVisual();
  });

  container.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sec = Number(btn.dataset.preset);
      stopInterval();
      timerState.totalSeconds = sec;
      timerState.remainingSeconds = sec;
      container.querySelectorAll('[data-preset]').forEach((b) => b.classList.toggle('active', b === btn));
      updateVisual();
    });
  });

  container.querySelector('#custom-timer-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = Number(container.querySelector('#custom-sec').value);
    const err = validatePositiveNumber(val, 'Custom timer', { min: 5, max: 3600 });
    const errEl = container.querySelector('#timer-err');
    if (err) {
      errEl.textContent = err;
      return;
    }
    errEl.textContent = '';
    stopInterval();
    timerState.totalSeconds = Math.round(val);
    timerState.remainingSeconds = Math.round(val);
    container.querySelectorAll('[data-preset]').forEach((b) => b.classList.remove('active'));
    updateVisual();
    showToast(`Timer set to ${Math.round(val)}s`);
  });
}
