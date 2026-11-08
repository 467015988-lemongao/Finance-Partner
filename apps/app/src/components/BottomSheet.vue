<script setup>
import { onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
})

const emit = defineEmits(['close'])

function close() {
  emit('close')
}

watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="sheet-overlay" @click.self="close">
        <div class="sheet" role="dialog" aria-modal="true" :aria-label="title || '底部弹窗'">
          <div class="sheet-handle" aria-hidden="true"></div>
          <div class="sheet-head">
            <h2 class="sheet-title">{{ title }}</h2>
            <button type="button" class="sheet-close" aria-label="关闭" @click="close">✕</button>
          </div>
          <div class="sheet-body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(10, 12, 16, 0.45);
}

.sheet {
  width: 100%;
  max-width: 520px;
  max-height: 88vh;
  overflow-y: auto;
  padding: 8px 18px calc(20px + env(safe-area-inset-bottom));
  border-radius: 22px 22px 0 0;
  background: var(--card);
  color: var(--text);
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.18);
}

.sheet-handle {
  width: 40px;
  height: 4px;
  margin: 2px auto 8px;
  border-radius: 999px;
  background: var(--line);
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
}

.sheet-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.sheet-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: var(--bg-soft);
  color: var(--muted);
  font-size: 14px;
}

.sheet-body {
  padding-top: 4px;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.22s ease;
}

.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform 0.26s cubic-bezier(0.2, 0.85, 0.3, 1);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}
</style>
