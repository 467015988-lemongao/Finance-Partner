import { reactive } from 'vue'

const STORAGE_KEY = 'expense-tracker:add-label'

export const DEFAULT_ADD_LABEL = '记一笔'
export const MAX_ADD_LABEL_LENGTH = 6

function readAddLabel() {
  try {
    const saved = String(localStorage.getItem(STORAGE_KEY) ?? '').trim()
    if (saved && [...saved].length <= MAX_ADD_LABEL_LENGTH) return saved
  } catch (error) {
    // 本地存储不可用时使用默认值
  }
  return DEFAULT_ADD_LABEL
}

export const preferences = reactive({
  addLabel: readAddLabel(),
})

export function setAddLabel(value) {
  const label = typeof value === 'string' ? value.trim() : ''
  if (!label) return '显示名不能为空'
  if ([...label].length > MAX_ADD_LABEL_LENGTH) {
    return `显示名最多 ${MAX_ADD_LABEL_LENGTH} 个字符`
  }
  preferences.addLabel = label
  try {
    localStorage.setItem(STORAGE_KEY, label)
  } catch (error) {
    // 本地存储不可用时仅在当前会话生效
  }
  return ''
}
