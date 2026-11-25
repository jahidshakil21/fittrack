/**
 * Shared UI helpers: XSS-safe escaping, toasts, modal, Chart.js lifecycle, timer alerts.
 */

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function showToast(message, type = 'success', durationMs = 2800) {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, durationMs);
}

export function openModal(title, bodyHtml, onMount = null) {
  const backdrop = document.getElementById('modal-backdrop');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  if (!backdrop || !titleEl || !bodyEl) return;

  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;
  backdrop.classList.add('open');

  if (typeof onMount === 'function') {
    onMount(bodyEl);
  }
}

export function closeModal() {
  const backdrop = document.getElementById('modal-backdrop');
  const bodyEl = document.getElementById('modal-body');
  if (backdrop) backdrop.classList.remove('open');
  if (bodyEl) bodyEl.innerHTML = '';
}

const activeCharts = new Map();

export function destroyAllCharts() {
  for (const chart of activeCharts.values()) {
    try {
      chart.destroy();
    } catch (_) {
      // ignore
    }
  }
  activeCharts.clear();
}

export function renderChart(canvas, key, config) {
  if (!canvas || typeof window.Chart === 'undefined') return null;
  if (activeCharts.has(key)) {
    activeCharts.get(key).destroy();
    activeCharts.delete(key);
  }

  const defaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#a1a1aa', boxWidth: 12, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: '#181b20',
        titleColor: '#f4f4f6',
        bodyColor: '#d4d4d8',
        borderColor: 'rgba(255,255,255,0.14)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: '#71717a', font: { size: 11 } },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
      y: {
        ticks: { color: '#71717a', font: { size: 11 } },
        grid: { color: 'rgba(255,255,255,0.06)' },
      },
    },
  };

  const mergedOptions = {
    ...defaults,
    ...(config.options || {}),
    plugins: { ...defaults.plugins, ...(config.options?.plugins || {}) },
    scales: config.options?.scales === false ? undefined : {
      x: { ...defaults.scales.x, ...(config.options?.scales?.x || {}) },
      y: { ...defaults.scales.y, ...(config.options?.scales?.y || {}) },
    },
  };

  const instance = new window.Chart(canvas, {
    ...config,
    options: mergedOptions,
  });
  activeCharts.set(key, instance);
  return instance;
}

let musicState = {
  ctx: null,
  intervalId: null,
  step: 0,
  playing: false,
};

/**
 * Starts an energetic ~136 BPM workout beat loop via Web Audio API (100% offline).
 * Must be called from a user gesture (e.g. clicking Start) for iOS Safari support.
 */
export function startTimerMusic() {
  if (musicState.playing) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = musicState.ctx || new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    musicState.ctx = ctx;
    musicState.playing = true;
    musicState.step = 0;

    // Pre-generate short white noise buffer for crisp hi-hats
    const noiseLen = Math.floor(ctx.sampleRate * 0.05);
    const noiseBuffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Energetic workout synth riff (Hz)
    const bassRiff = [110, 110, 130.81, 146.83, 164.81, 146.83, 130.81, 98];
    const leadRiff = [440, 523.25, 659.25, 587.33, 659.25, 783.99, 659.25, 523.25];

    const playStep = () => {
      if (!musicState.playing || !musicState.ctx) return;
      const now = ctx.currentTime;
      const idx = musicState.step % 8;

      // 1. Punchy Kick Drum on quarter-note beats (0, 2, 4, 6)
      if (idx % 2 === 0) {
        const kick = ctx.createOscillator();
        const kGain = ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(145, now);
        kick.frequency.exponentialRampToValueAtTime(42, now + 0.11);
        kGain.gain.setValueAtTime(0.28, now);
        kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        kick.connect(kGain);
        kGain.connect(ctx.destination);
        kick.start(now);
        kick.stop(now + 0.17);
      } else {
        // 2. Crisp Hi-Hat on off-beats (1, 3, 5, 7)
        const hat = ctx.createBufferSource();
        hat.buffer = noiseBuffer;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(6500, now);
        const hGain = ctx.createGain();
        hGain.gain.setValueAtTime(0.14, now);
        hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        hat.connect(hp);
        hp.connect(hGain);
        hGain.connect(ctx.destination);
        hat.start(now);
      }

      // 3. Driving Synth Bass
      const bass = ctx.createOscillator();
      const bFilter = ctx.createBiquadFilter();
      const bGain = ctx.createGain();
      bass.type = 'sawtooth';
      bass.frequency.setValueAtTime(bassRiff[idx], now);
      bFilter.type = 'lowpass';
      bFilter.frequency.setValueAtTime(600, now);
      bGain.gain.setValueAtTime(0.16, now);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      bass.connect(bFilter);
      bFilter.connect(bGain);
      bGain.connect(ctx.destination);
      bass.start(now);
      bass.stop(now + 0.2);

      // 4. High-energy Lead Synth accent on alternating steps
      if (idx % 2 === 0 || idx === 7) {
        const lead = ctx.createOscillator();
        const lGain = ctx.createGain();
        lead.type = 'triangle';
        lead.frequency.setValueAtTime(leadRiff[idx], now);
        lGain.gain.setValueAtTime(0.09, now);
        lGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        lead.connect(lGain);
        lGain.connect(ctx.destination);
        lead.start(now);
        lead.stop(now + 0.19);
      }

      musicState.step += 1;
    };

    playStep();
    musicState.intervalId = setInterval(playStep, 220);
  } catch (_) {
    // ignore audio restriction
  }
}

export function stopTimerMusic() {
  musicState.playing = false;
  if (musicState.intervalId) {
    clearInterval(musicState.intervalId);
    musicState.intervalId = null;
  }
  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } catch (_) {
    // ignore
  }
}

let selectedVoiceURI = '';

const PREFERRED_VOICE_KEYWORDS = [
  'natural',
  'aria',
  'guy',
  'ryan',
  'jenny',
  'sonia',
  'google uk english',
  'google us english',
  'samantha',
  'daniel',
  'karen',
  'ava',
  'allison',
  'siri',
  'enhanced',
];

function rankVoice(voice) {
  const name = (voice.name || '').toLowerCase();
  const lang = (voice.lang || '').toLowerCase();
  let score = lang.startsWith('en') ? 10 : 0;
  for (let i = 0; i < PREFERRED_VOICE_KEYWORDS.length; i++) {
    if (name.includes(PREFERRED_VOICE_KEYWORDS[i])) {
      score += (PREFERRED_VOICE_KEYWORDS.length - i) * 3;
    }
  }
  if (!voice.localService) score += 5; // Online/neural voices sound much smoother
  return score;
}

export function listEnglishVoices() {
  if (!('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices() || [];
  const en = voices.filter((v) => (v.lang || '').toLowerCase().startsWith('en'));
  const pool = en.length ? en : voices;
  return [...pool].sort((a, b) => rankVoice(b) - rankVoice(a));
}

export function getSelectedVoiceURI() {
  return selectedVoiceURI;
}

export function setSelectedVoiceURI(uri) {
  selectedVoiceURI = uri || '';
}

function resolveBestVoice() {
  const voices = listEnglishVoices();
  if (!voices.length) return null;
  if (selectedVoiceURI) {
    const match = voices.find((v) => v.voiceURI === selectedVoiceURI);
    if (match) return match;
  }
  return voices[0];
}

/**
 * Speaks a countdown cue ("Ready", "1".."5", "Start", or "5".."1")
 * using the strongest/most natural available voice, and invokes onStart
 * at the exact moment speech begins (with fallback).
 */
export function speakCountdownNumber(cue, isFinalCountdown = false, onStart = null) {
  let fired = false;
  const trigger = () => {
    if (fired) return;
    fired = true;
    if (typeof cue === 'number') {
      playCountdownTick(isFinalCountdown);
    }
    if (typeof onStart === 'function') {
      onStart();
    }
  };

  try {
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(String(cue));
      const voice = resolveBestVoice();
      if (voice) utter.voice = voice;
      utter.rate = 1.08;
      utter.pitch = isFinalCountdown ? 1.02 : 0.94; // warmer, stronger tone
      utter.volume = 1.0;
      utter.onstart = trigger;
      utter.onerror = trigger;
      window.speechSynthesis.speak(utter);
      setTimeout(trigger, 750);
      return;
    }
  } catch (_) {
    // ignore speech synthesis restrictions
  }
  trigger();
}

/**
 * Plays a short counting tick sound for the first 5 seconds and last 5 seconds.
 */
export function playCountdownTick(isFinalCountdown = false) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = musicState.ctx || new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    musicState.ctx = ctx;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isFinalCountdown ? 920 : 660, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch (_) {
    // ignore audio restriction
  }
}

/**
 * Plays a short two-tone chime via Web Audio API and triggers vibration if supported.
 */
export function playTimerAlert() {
  stopTimerMusic();
  try {
    if (navigator.vibrate) {
      navigator.vibrate([220, 120, 220, 120, 320]);
    }
  } catch (_) {
    // ignore unsupported vibration
  }

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    [880, 1174.66].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.18);
      gain.gain.setValueAtTime(0.001, now + idx * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.25, now + idx * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.18);
      osc.stop(now + idx * 0.18 + 0.36);
    });
  } catch (_) {
    // ignore audio restriction
  }
}
