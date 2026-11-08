<script setup>
import { reactive, ref } from 'vue';
import { todayStr, withAlpha } from '../utils/format';

const props = defineProps({
  categories: { type: Array, default: () => [] },
  initial: { type: Object, default: null },
  submitText: { type: String, default: '保存' },
  submitting: { type: Boolean, default: false },
  serverError: { type: String, default: '' },
  showCancel: { type: Boolean, default: false },
});

const emit = defineEmits(['submit', 'cancel']);

const form = reactive({
  amount: props.initial ? String(props.initial.amount ?? '') : '',
  categoryId: props.initial?.categoryId || props.categories[0]?.id || '',
  date: props.initial?.date || todayStr(),
  note: props.initial?.note || '',
});

const error = ref('');

function validate() {
  const raw = String(form.amount).trim();
  const number = Number(raw);
  if (!raw || !Number.isFinite(number) || number <= 0 || !/^\d+(\.\d{1,2})?$/.test(raw)) {
    return '请输入大于 0 的金额（最多两位小数）';
  }
  if (!form.categoryId) return '请选择记账类目';
  if (!form.date) return '请选择日期';
  if ([...form.note].length > 50) return '备注最多 50 个字符';
  return '';
}

function handleSubmit() {
  error.value = validate();
  if (error.value) return;
  emit('submit', {
    amount: Number(form.amount),
    categoryId: form.categoryId,
    date: form.date,
    note: form.note.trim(),
  });
}

function reset() {
  form.amount = '';
  form.note = '';
  form.date = todayStr();
  if (!form.categoryId) form.categoryId = props.categories[0]?.id || '';
  error.value = '';
}

defineExpose({ reset });
</script>

<template>
  <form class="record-form" @submit.prevent="handleSubmit">
    <div class="form-group">
      <label class="form-label" for="record-amount">金额</label>
      <div class="amount-field">
        <span class="currency">¥</span>
        <input
          id="record-amount"
          v-model="form.amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          autocomplete="off"
        />
      </div>
    </div>

    <div class="form-group">
      <span class="form-label">类目</span>
      <div class="category-grid">
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          class="category-pill"
          :class="{ active: form.categoryId === category.id }"
          @click="form.categoryId = category.id"
        >
          <span class="cat-icon" :style="{ background: withAlpha(category.color, 0.14) }">
            {{ category.icon }}
          </span>
          <span class="cat-name">{{ category.name }}</span>
        </button>
      </div>
      <p v-if="!categories.length" class="form-hint">
        暂无可用类目，请先在「类目管理」中添加
      </p>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="record-date">日期</label>
        <input id="record-date" v-model="form.date" class="input" type="date" />
      </div>
      <div class="form-group">
        <label class="form-label" for="record-note">备注</label>
        <input
          id="record-note"
          v-model="form.note"
          class="input"
          type="text"
          maxlength="50"
          placeholder="选填，最多 50 字"
        />
      </div>
    </div>

    <p v-if="error || serverError" class="form-error">{{ error || serverError }}</p>

    <div class="form-actions">
      <button v-if="showCancel" type="button" class="btn btn-ghost" @click="emit('cancel')">
        取消
      </button>
      <button type="submit" class="btn btn-primary" :disabled="submitting">
        {{ submitting ? '保存中…' : submitText }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.record-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.amount-field {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  background: #f8faff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.amount-field:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(47, 107, 255, 0.12);
}

.currency {
  color: var(--text-muted);
  font-size: 20px;
  font-weight: 600;
}

.amount-field input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 28px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 10px;
}

.category-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 11px 8px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  background: #fff;
  transition: border-color 0.15s ease, background-color 0.15s ease,
    box-shadow 0.15s ease;
}

.category-pill:hover {
  border-color: #c9d6f8;
}

.category-pill.active {
  border-color: var(--primary);
  background: var(--primary-soft);
  box-shadow: 0 0 0 3px rgba(47, 107, 255, 0.1);
}

.cat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  font-size: 18px;
}

.cat-name {
  color: var(--text-2);
  font-size: 12px;
  font-weight: 500;
}

.category-pill.active .cat-name {
  color: var(--primary-strong);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}
</style>
