<script setup>
import { ref, watch } from 'vue'
import { formatMoney, todayString } from '../utils/format'

const props = defineProps({
  initial: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
  submitting: { type: Boolean, default: false },
  submitLabel: { type: String, default: '保存' },
})

const emit = defineEmits(['submit', 'error'])

const amount = ref('')
const categoryId = ref('')
const date = ref(todayString())
const note = ref('')

function syncFromInitial(value) {
  if (value) {
    amount.value = formatMoney(value.amount)
    categoryId.value = value.categoryId || ''
    date.value = value.date || todayString()
    note.value = value.note || ''
  } else {
    amount.value = ''
    categoryId.value = ''
    date.value = todayString()
    note.value = ''
  }
}

watch(() => props.initial, syncFromInitial, { immediate: true })

watch(
  () => props.categories,
  (list) => {
    if (!categoryId.value && list && list.length) {
      categoryId.value = list[0].id
    }
  },
  { immediate: true },
)

function onAmountInput(event) {
  let next = String(event.target.value).replace(/[^\d.]/g, '')
  const dotIndex = next.indexOf('.')
  if (dotIndex !== -1) {
    next = `${next.slice(0, dotIndex + 1)}${next.slice(dotIndex + 1).replace(/\./g, '')}`
  }
  const matched = /^(\d*)(?:\.(\d{0,2}))?/.exec(next)
  next = matched
    ? `${matched[1]}${matched[2] !== undefined ? `.${matched[2]}` : ''}`
    : ''
  amount.value = next
  if (event.target.value !== next) event.target.value = next
}

function useToday() {
  date.value = todayString()
}

function handleSubmit() {
  const text = String(amount.value).trim()
  if (!/^\d+(\.\d{1,2})?$/.test(text) || Number(text) <= 0) {
    emit('error', '请输入大于 0 的金额（最多两位小数）')
    return
  }
  if (!categoryId.value) {
    emit('error', '请选择记账类目')
    return
  }
  if (!date.value) {
    emit('error', '请选择日期')
    return
  }
  emit('submit', {
    amount: Number(text),
    categoryId: categoryId.value,
    date: date.value,
    note: String(note.value).trim(),
  })
}

function resetAfterSave() {
  amount.value = ''
  note.value = ''
  date.value = todayString()
}

defineExpose({ resetAfterSave })
</script>

<template>
  <form class="record-form" novalidate @submit.prevent="handleSubmit">
    <div class="amount-row">
      <span class="currency" aria-hidden="true">¥</span>
      <input
        class="amount-input"
        :value="amount"
        type="text"
        inputmode="decimal"
        enterkeyhint="done"
        placeholder="0.00"
        aria-label="金额"
        @input="onAmountInput"
      />
    </div>

    <div class="field-block">
      <div class="field-label">类目</div>
      <div v-if="!categories.length" class="inline-empty">暂无可用类目，请到「我的」新增</div>
      <div v-else class="category-grid">
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          class="category-item"
          :class="{ selected: categoryId === category.id }"
          @click="categoryId = category.id"
        >
          <span class="category-emoji">{{ category.icon }}</span>
          <span class="category-name">{{ category.name }}</span>
        </button>
      </div>
    </div>

    <div class="field-block">
      <div class="field-label">日期</div>
      <div class="date-row">
        <input v-model="date" class="date-input" type="date" aria-label="日期" />
        <button type="button" class="chip" @click="useToday">今天</button>
      </div>
    </div>

    <div class="field-block">
      <div class="field-label">备注</div>
      <input
        v-model="note"
        class="text-input"
        type="text"
        maxlength="50"
        placeholder="备注（可选）"
        aria-label="备注"
      />
    </div>

    <button type="submit" class="btn-primary" :disabled="submitting">
      {{ submitting ? '保存中…' : submitLabel }}
    </button>
  </form>
</template>

<style scoped>
.record-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.amount-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 0 10px;
  border-bottom: 2px solid var(--line);
  transition: border-color 0.15s ease;
}

.amount-row:focus-within {
  border-color: var(--primary);
}

.currency {
  flex-shrink: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--text-2);
}

.amount-input {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text);
  font-size: 44px;
  font-weight: 800;
  letter-spacing: -1px;
  outline: none;
}

.amount-input::placeholder {
  color: var(--muted);
  font-weight: 400;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 70px;
  padding: 10px 4px;
  border: 1.5px solid transparent;
  border-radius: 14px;
  background: var(--bg-soft);
  color: var(--text);
  transition: border-color 0.15s ease, background 0.15s ease;
}

.category-item.selected {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.category-emoji {
  font-size: 24px;
  line-height: 1;
}

.category-name {
  max-width: 100%;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.2;
  color: var(--text-2);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-item.selected .category-name {
  color: var(--primary);
  font-weight: 600;
}

.date-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.date-input {
  flex: 1;
  min-width: 0;
}

.inline-empty {
  padding: 14px;
  border-radius: 12px;
  background: var(--bg-soft);
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}
</style>
