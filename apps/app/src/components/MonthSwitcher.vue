<script setup>
import { formatMonthLabel } from '../utils/format'

defineProps({
  month: { type: String, required: true },
})

defineEmits(['shift'])
</script>

<template>
  <div class="month-switch">
    <button
      type="button"
      class="month-btn"
      aria-label="上个月"
      @click="$emit('shift', -1)"
    >
      ‹
    </button>
    <div class="month-label">{{ formatMonthLabel(month) }}</div>
    <button
      type="button"
      class="month-btn"
      aria-label="下个月"
      @click="$emit('shift', 1)"
    >
      ›
    </button>
  </div>
</template>

<style scoped>
.month-switch {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.month-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: var(--card);
  color: var(--text);
  font-size: 22px;
  line-height: 1;
  box-shadow: var(--shadow);
}

.month-btn:active {
  background: var(--bg-soft);
}

.month-label {
  min-width: 116px;
  font-size: 17px;
  font-weight: 700;
  text-align: center;
}
</style>
