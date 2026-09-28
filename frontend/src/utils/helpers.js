// ============================================================
// HELPER FUNCTIONS
// ============================================================

let idCounter = 0;

export function generateId(prefix = 'id') {
  idCounter++;
  return `${prefix}_${Date.now()}_${idCounter}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('uz-UZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatMoney(amount) {
  if (amount === null || amount === undefined) return '0 so\'m';
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
}

export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('uz-UZ').format(num);
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = target - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isOverdue(dateStr) {
  const days = daysUntil(dateStr);
  return days !== null && days < 0;
}

export function getRelativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) return formatDate(dateStr);
  if (days > 0) return `${days} kun oldin`;
  if (hours > 0) return `${hours} soat oldin`;
  if (minutes > 0) return `${minutes} daqiqa oldin`;
  return 'hozir';
}

export function truncateText(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function formatUzPhone(value) {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return '+998';
  const withoutPrefix = digits.replace(/^998/, '');
  const trimmed = withoutPrefix.slice(0, 9);
  return trimmed ? `+998${trimmed}` : '+998';
}

export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Calculate percentage
export function percentage(actual, target) {
  if (!target || target === 0) return 0;
  return Math.round((actual / target) * 100);
}

// Get current month string in YYYY-MM format
export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Get quarter from month
export function currentQuarter() {
  const month = new Date().getMonth();
  return Math.floor(month / 3) + 1;
}
