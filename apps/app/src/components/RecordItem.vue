<script setup>
import { computed, ref } from 'vue'
import { formatMoney, hexToRgba } from '../utils/format'

const props = defineProps({
  record: { type: Object, required: true },
  category: { type: Object, default: null },
})

const emit = defineEmits(['edit', 'delete'])

const offset = ref(0)
const dragging = ref(false)
const open = computed(() => offset.value < 0)

const iconStyle = computed(() => {
  const color = props.category && props.category.color
  return color ? { backgroundColor: hexToRgba(color, 0.16) } : null
})

const categoryName = computed(() => (props.category ? props.category.name : '未知类目'))
const categoryIcon = computed(() => (props.category ? props.category.icon : '📦'))

let startX = 0
let startY = 0
let startOffset = 0
let horizontal = null
let moved = false
let suppressClickUntil = 0

function onTouchStart(event) {
  const touch = event.touches[0]
  if (!touch) return
  startX = touch.clientX
  startY = touch.clientY
  startOffset = offset.value
  horizontal = null
  moved = false
  dragging.value = true
}

function onTouchMove(event) {
  if (!dragging.value) return
  const touch = event.touches[0]
  if (!touch) return
  const dx = touch.clientX - startX
  const dy = touch.clientY - startY

  if (horizontal === null) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
    horizontal = Math.abs(dx) > Math.abs(dy)
    if (!horizontal) {
      dragging.value = false
      return
    }
  }

  if (!horizontal) return
  if (Math.abs(dx) > 10) moved = true
  if (moved && event.cancelable) event.preventDefault()
  offset.value = Math.max(-80, Math.min(0, startOffset + dx))
}

function onTouchEnd() {
  if (!dragging.value) return
  dragging.value = false
  if (!horizontal) return
  offset.value = offset.value < -70 ? -80 : 0
  if (moved) suppressClickUntil = Date.now() + 350
}

function onClick() {
  if (Date.now() < suppressClickUntil) return
  if (offset.value !== 0) {
    offset.value = 0
    return
  }
  emit('edit', props.record)
}

function onDelete() {
  offset.value = 0
  emit('delete', props.record)
}
</script>

<template>
  <div
    class="record-row"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
  >
    <button
      type="button"
      class="record-delete"
      :tabindex="open ? 0 : -1"
      :aria-hidden="open ? 'false' : 'true'"
      @click.stop="onDelete"
    >
      删除
    </button>
    <div
      class="record-content"
      :class="{ swiping: dragging }"
      :style="{ transform: `translateX(${offset}px)` }"
      @click="onClick"
    >
      <div class="record-icon" :style="iconStyle">{{ categoryIcon }}</div>
      <div class="record-main">
        <div class="record-name">{{ categoryName }}</div>
        <div v-if="record.note" class="record-note">{{ record.note }}</div>
      </div>
      <div class="record-amount">¥{{ formatMoney(record.amount) }}</div>
    </div>
  </div>
</template>

<style scoped>
.record-row {
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  background: transparent;
}

.record-delete {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 80px;
  border: 0;
  background: var(--danger);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.record-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--card);
  transition: transform 0.18s ease;
  will-change: transform;
  touch-action: pan-y;
}

.record-content.swiping {
  transition: none;
}

.record-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--bg-soft);
  font-size: 21px;
}

.record-main {
  flex: 1;
  min-width: 0;
}

.record-name {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
}

.record-note {
  margin-top: 2px;
  overflow: hidden;
  font-size: 12px;
  color: var(--muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-amount {
  flex-shrink: 0;
  font-size: 16px;
  font-weight: 700;
}
</style>
