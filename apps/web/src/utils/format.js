const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function pad2(value) {
  return String(value).padStart(2, '0');
}

export function formatMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : '0.00';
}

export function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export function currentMonth() {
  return todayStr().slice(0, 7);
}

export function shiftMonth(month, delta) {
  const [year, monthNumber] = String(month).split('-').map(Number);
  const total = year * 12 + (monthNumber - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = ((total % 12) + 12) % 12 + 1;
  return `${nextYear}-${pad2(nextMonth)}`;
}

export function formatMonthLabel(month) {
  const [year, monthNumber] = String(month).split('-');
  return `${year}年${monthNumber}月`;
}

export function formatDateLabel(dateString) {
  const [year, month, day] = String(dateString ?? '').split('-').map(Number);
  if (!year || !month || !day) return String(dateString ?? '');
  const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()];
  return `${month}月${day}日 ${weekday}`;
}

export function withAlpha(hex, alpha = 0.14) {
  let value = String(hex ?? '').trim().replace('#', '');
  if (value.length === 3) {
    value = value.split('').map((char) => char + char).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return `rgba(140, 140, 140, ${alpha})`;
  }
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
