/**
 * Local date and time helpers (avoids UTC off-by-one-day bugs on iPhone).
 */

export function toLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function getPastDates(days = 7, endDate = new Date()) {
  const list = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - i);
    list.push(toLocalDateString(dt));
  }
  return list;
}

export function formatShortDate(dateStr) {
  const dt = parseLocalDate(dateStr);
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatWeekdayShort(dateStr) {
  const dt = parseLocalDate(dateStr);
  return dt.toLocaleDateString(undefined, { weekday: 'short' });
}

export function getTodayWeekdayKey() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

export function generateId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
