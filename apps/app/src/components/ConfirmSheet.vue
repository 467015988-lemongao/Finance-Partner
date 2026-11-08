<script setup>
import BottomSheet from './BottomSheet.vue'

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '请确认' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: '确定' },
  busy: { type: Boolean, default: false },
})

defineEmits(['cancel', 'confirm'])
</script>

<template>
  <BottomSheet :open="open" :title="title" @close="$emit('cancel')">
    <p class="confirm-message">{{ message }}</p>
    <div class="confirm-actions">
      <button type="button" class="btn-secondary" :disabled="busy" @click="$emit('cancel')">
        取消
      </button>
      <button type="button" class="btn-danger" :disabled="busy" @click="$emit('confirm')">
        {{ busy ? '处理中…' : confirmText }}
      </button>
    </div>
  </BottomSheet>
</template>

<style scoped>
.confirm-message {
  margin: 4px 0 22px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-2);
  word-break: break-word;
}

.confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
</style>
