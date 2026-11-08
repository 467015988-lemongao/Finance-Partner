<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  initial: { type: Object, default: null },
  defaultType: { type: String, default: 'expense' },
  submitting: { type: Boolean, default: false },
  submitLabel: { type: String, default: '保存' },
})

const emit = defineEmits(['submit', 'error'])

const PRESET_COLORS = [
  '#ff7a45',
  '#40a9ff',
  '#9254de',
  '#36cfc9',
  '#ffc53d',
  '#ff4d4f',
  '#8c8c8c',
  '#2f6bff',
]

const PRESET_ICONS = ['🍜', '🚌', '🛍️', '🏠', '🎮', '💊', '📦', '✨']

const name = ref('')
const icon = ref('📦')
const color = ref(PRESET_COLORS[0])
const type = ref('expense')

function normalizeType(value) {
  return value === 'income' ? 'income' : 'expense'
}

function syncFromInitial(value) {
  name.value = value ? value.name || '' : ''
  icon.value = value ? value.icon || '📦' : '📦'
  color.value = value ? value.color || PRESET_COLORS[0] : PRESET_COLORS[0]
  type.value = value
    ? normalizeType(value.type)
    : normalizeType(props.defaultType)
}

watch(() => props.initial, syncFromInitial, { immediate: true })

function pickIcon(value) {
  icon.value = value
}

function handleSubmit() {
  const trimmedName = String(name.value).trim()
  if (!trimmedName) {
    emit('error', '请输入类目名称')
    return
  }
  emit('submit', {
    name: trimmedName,
    icon: String(icon.value).trim() || '📦',
    color: color.value || PRESET_COLORS[0],
    type: type.value,
  })
}
</script>

<template>
  <form class="category-form" novalidate @submit.prevent="handleSubmit">
    <div class="field-block">
      <div class="field-label">类型</div>
      <div v-if="initial" class="type-readonly">
        {{ type === 'income' ? '收入类目' : '支出类目' }}
      </div>
      <div v-else class="segmented" role="group" aria-label="类目类型">
        <button
          type="button"
          :class="{ active: type === 'expense' }"
          :aria-pressed="type === 'expense'"
          @click="type = 'expense'"
        >
          支出
        </button>
        <button
          type="button"
          class="income"
          :class="{ active: type === 'income' }"
          :aria-pressed="type === 'income'"
          @click="type = 'income'"
        >
          收入
        </button>
      </div>
    </div>

    <div class="field-block">
      <label class="field-label" for="category-name">类目名称</label>
      <input
        id="category-name"
        v-model="name"
        class="text-input"
        type="text"
        maxlength="10"
        placeholder="最多 10 个字符"
      />
    </div>

    <div class="field-block">
      <label class="field-label" for="category-icon">图标（Emoji）</label>
      <div class="icon-row">
        <input
          id="category-icon"
          v-model="icon"
          class="text-input icon-input"
          type="text"
          maxlength="4"
          placeholder="🍜"
        />
        <div class="icon-preview" :style="{ backgroundColor: color }" aria-hidden="true">
          {{ icon || '📦' }}
        </div>
      </div>
      <div class="emoji-row">
        <button
          v-for="item in PRESET_ICONS"
          :key="item"
          type="button"
          class="emoji-btn"
          :class="{ active: icon === item }"
          @click="pickIcon(item)"
        >
          {{ item }}
        </button>
      </div>
    </div>

    <div class="field-block">
      <div class="field-label">颜色</div>
      <div class="color-row">
        <button
          v-for="item in PRESET_COLORS"
          :key="item"
          type="button"
          class="color-dot"
          :class="{ active: color === item }"
          :style="{ backgroundColor: item }"
          :aria-label="`选择颜色 ${item}`"
          @click="color = item"
        ></button>
        <label class="color-picker" title="自定义颜色">
          <input v-model="color" type="color" aria-label="自定义颜色" />
          <span class="color-picker-icon">🎨</span>
        </label>
      </div>
    </div>

    <button type="submit" class="btn-primary" :disabled="submitting">
      {{ submitting ? '保存中…' : submitLabel }}
    </button>
  </form>
</template>

<style scoped>
.category-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.type-readonly {
  min-height: 42px;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--bg-soft);
  color: var(--text-2);
  font-size: 14px;
  font-weight: 600;
}

.icon-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-input {
  flex: 1;
  min-width: 0;
  font-size: 18px;
}

.icon-preview {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  font-size: 24px;
}

.emoji-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.emoji-btn {
  width: 40px;
  height: 40px;
  border: 1.5px solid transparent;
  border-radius: 10px;
  background: var(--bg-soft);
  font-size: 19px;
  line-height: 1;
}

.emoji-btn.active {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.color-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.color-dot {
  width: 32px;
  height: 32px;
  border: 2px solid transparent;
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--line);
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.color-dot.active {
  border-color: var(--card);
  transform: scale(1.12);
  box-shadow: 0 0 0 2px var(--primary);
}

.color-picker {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  overflow: hidden;
  border-radius: 50%;
  background: var(--bg-soft);
  cursor: pointer;
}

.color-picker input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  opacity: 0;
  cursor: pointer;
}

.color-picker-icon {
  font-size: 18px;
  line-height: 1;
  pointer-events: none;
}
</style>
