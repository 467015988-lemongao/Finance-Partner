<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  active: { type: String, default: '' },
});

defineEmits(['select']);
</script>

<template>
  <aside class="side-nav">
    <div class="brand">
      <div class="brand-logo">💰</div>
      <div class="brand-text">
        <div class="brand-name">生活记账</div>
        <div class="brand-sub">每日生活成本</div>
      </div>
    </div>

    <nav class="nav-list">
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="nav-item"
        :class="{ active: item.key === active }"
        @click="$emit('select', item.key)"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <div class="nav-footer">数据仅保存在本机</div>
  </aside>
</template>

<style scoped>
.side-nav {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width);
  padding: 28px 16px 20px;
  color: #fff;
  background: linear-gradient(180deg, #131b31 0%, #1b2a4d 55%, #16233f 100%);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 8px 22px;
  margin-bottom: 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  font-size: 22px;
  background: linear-gradient(135deg, #2f6bff, #6c9bff);
  box-shadow: 0 6px 16px rgba(47, 107, 255, 0.35);
  flex-shrink: 0;
}

.brand-name {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
}

.brand-sub {
  margin-top: 2px;
  font-size: 11px;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.55);
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: rgba(255, 255, 255, 0.72);
  font-size: 14px;
  text-align: left;
  transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.nav-item.active {
  color: #fff;
  background: linear-gradient(90deg, rgba(47, 107, 255, 0.95), rgba(47, 107, 255, 0.62));
  box-shadow: 0 8px 20px rgba(47, 107, 255, 0.28);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: -16px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: #8fb2ff;
}

.nav-icon {
  width: 20px;
  font-size: 17px;
  text-align: center;
}

.nav-footer {
  margin-top: auto;
  padding: 16px 8px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.38);
  font-size: 11px;
  letter-spacing: 0.3px;
}
</style>
