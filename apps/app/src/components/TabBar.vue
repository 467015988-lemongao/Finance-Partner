<script setup>
defineProps({
  active: { type: String, default: 'add' },
})

defineEmits(['change'])

const items = [
  { key: 'add', icon: '✏️', label: '记一笔' },
  { key: 'records', icon: '📋', label: '明细' },
  { key: 'stats', icon: '📊', label: '统计' },
  { key: 'profile', icon: '👤', label: '我的' },
]
</script>

<template>
  <nav class="tabbar" aria-label="主导航">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      class="tab-item"
      :class="{ active: active === item.key }"
      :aria-current="active === item.key ? 'page' : undefined"
      @click="$emit('change', item.key)"
    >
      <span class="tab-icon">{{ item.icon }}</span>
      <span class="tab-label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed;
  left: 50%;
  bottom: 0;
  z-index: 100;
  display: flex;
  width: 100%;
  max-width: 520px;
  padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
  background: var(--card);
  border-top: 1px solid var(--line);
  transform: translateX(-50%);
}

.tab-item {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 44px;
  min-height: 48px;
  padding: 4px 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--muted);
  transition: color 0.15s ease, background 0.15s ease;
}

.tab-item.active {
  color: var(--primary);
  font-weight: 700;
  background: var(--primary-soft);
}

.tab-icon {
  font-size: 20px;
  line-height: 1;
}

.tab-label {
  font-size: 11px;
  line-height: 1.2;
}
</style>
