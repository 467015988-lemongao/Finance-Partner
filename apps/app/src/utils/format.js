export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function pad2(value) {
  return String(value).padStart(2, '0')
}

export function todayString() {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

export function currentMonthKey() {
  return todayString().slice(0, 7)
}

export function parseMonthKey(key) {
  const [year, month] = String(key).split('-').map(Number)
  return { year, month }
}

export function shiftMonthKey(key, delta) {
  const { year, month } = parseMonthKey(key)
  const total = year * 12 + (month - 1) + delta
  const nextYear = Math.floor(total / 12)
  const nextMonth = ((total % 12) + 12) % 12 + 1
  return `${nextYear}-${pad2(nextMonth)}`
}

export function formatMonthLabel(key) {
  const { year, month } = parseMonthKey(key)
  return `${year}年${month}月`
}

export function formatMonthDay(key) {
  const { month } = parseMonthKey(key)
  return `${month}月`
}

export function formatDateLabel(date) {
  const [year, month, day] = String(date).split('-').map(Number)
  const weekday = new Date(year, month - 1, day).getDay()
  return `${month}月${pad2(day)}日 周${WEEKDAYS[weekday]}`
}

export function formatTodayLabel() {
  const now = new Date()
  return `${now.getMonth() + 1}月${pad2(now.getDate())}日 周${WEEKDAYS[now.getDay()]}`
}

export function formatMoney(value) {
  const num = Number(value)
  return (Number.isFinite(num) ? num : 0).toFixed(2)
}

export function hexToRgba(hex, alpha = 1) {
  const raw = String(hex || '').replace('#', '')
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((char) => char + char)
          .join('')
      : raw
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return `rgba(140, 140, 140, ${alpha})`
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
