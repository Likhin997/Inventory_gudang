/**
 * Date & Time Utilities with Asia/Jakarta (WIB) Timezone Support
 */

/**
 * Format timestamp / date to Asia/Jakarta (WIB) full format:
 * Example: "15/09/2026, 10:07:08 WIB"
 */
export function formatDateTimeWIB(d: string | Date | undefined | null): string {
  if (!d) return '-';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) {
    return String(d);
  }

  const formatted = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(dateObj).replace(/\./g, ':');

  return `${formatted} WIB`;
}

/**
 * Format timestamp / date to Asia/Jakarta (WIB) date-only format:
 * Example: "15/09/2026"
 */
export function formatDateWIB(d: string | Date | undefined | null): string {
  if (!d) return '-';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) {
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
      const [y, m, day] = d.slice(0, 10).split('-');
      return `${day}/${m}/${y}`;
    }
    return String(d);
  }

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dateObj);
}

/**
 * Extract YYYY-MM-DD string in Asia/Jakarta timezone
 */
export function getDateInAsiaJakarta(d: string | Date | undefined | null): string | null {
  if (!d) return null;
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) {
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
      return d.slice(0, 10);
    }
    return null;
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dateObj);
}

/**
 * Returns today's date in Asia/Jakarta as YYYY-MM-DD
 */
export function getTodayInAsiaJakarta(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

/**
 * Returns date N days ago in Asia/Jakarta as YYYY-MM-DD
 */
export function getDaysAgoInAsiaJakarta(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/**
 * Returns the first day of current month in Asia/Jakarta as YYYY-MM-DD
 */
export function getMonthStartInAsiaJakarta(): string {
  const today = getTodayInAsiaJakarta();
  return today.slice(0, 8) + '01';
}

/**
 * Returns the last day of current month in Asia/Jakarta as YYYY-MM-DD
 */
export function getMonthEndInAsiaJakarta(): string {
  const now = new Date();
  const nextMonthFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastDay = new Date(nextMonthFirst.getTime() - 24 * 60 * 60 * 1000);
  return getDateInAsiaJakarta(lastDay) || getTodayInAsiaJakarta();
}
