<script setup>
import { onMounted, onUnmounted } from 'vue';

defineProps({
  title: { type: String, default: '' },
  width: { type: String, default: '460px' },
});

const emit = defineEmits(['close']);

function handleKeydown(event) {
  if (event.key === 'Escape') emit('close');
}

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <Teleport to="body">
    <div class="modal-mask" @click.self="emit('close')">
      <div class="modal-card" :style="{ width }" role="dialog" aria-modal="true">
        <header class="modal-header">
          <h3 class="modal-title">{{ title }}</h3>
          <button type="button" class="modal-close" aria-label="关闭" @click="emit('close')">
            ✕
          </button>
        </header>
        <div class="modal-body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
  animation: fade 0.15s ease;
}

.modal-card {
  display: flex;
  flex-direction: column;
  max-width: 100%;
  max-height: 90vh;
  overflow: hidden;
  background: var(--card);
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
  animation: pop 0.18s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 16px;
  font-weight: 700;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: #f1f4fa;
  color: var(--text-2);
  font-size: 14px;
  line-height: 1;
}

.modal-close:hover {
  background: #e6ebf5;
  color: var(--text);
}

.modal-body {
  padding: 22px;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 22px;
  border-top: 1px solid var(--border);
  background: #fbfcfe;
}

@keyframes fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes pop {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
