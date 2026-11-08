<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import AppModal from '../components/AppModal.vue';
import { apiDelete, apiGet, apiPost, apiPut } from '../api';
import { withAlpha } from '../utils/format';

const PRESET_COLORS = [
  '#ff7a45',
  '#40a9ff',
  '#9254de',
  '#36cfc9',
  '#ffc53d',
  '#ff4d4f',
  '#52c41a',
  '#8c8c8c',
];

const emit = defineEmits(['categories-changed']);

const items = ref([]);
const activeType = ref('expense');
const loading = ref(true);
const errorMsg = ref('');

const modalOpen = ref(false);
const editingId = ref('');
const form = reactive({ name: '', icon: '', color: PRESET_COLORS[0], type: 'expense' });
const formError = ref('');
const saving = ref(false);

const deleteTarget = ref(null);
const deleteError = ref('');
const deleting = ref(false);

function normalizeType(type) {
  return type === 'income' ? 'income' : 'expense';
}

const filteredItems = computed(() =>
  items.value.filter((item) => normalizeType(item.type) === activeType.value),
);
const typeCounts = computed(() => {
  let expense = 0;
  let income = 0;
  for (const item of items.value) {
    if (normalizeType(item.type) === 'income') income += 1;
    else expense += 1;
  }
  return { expense, income };
});
const activeTypeLabel = computed(() => (activeType.value === 'income' ? '收入' : '支出'));

async function load() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const data = await apiGet('/categories');
    items.value = data.items || [];
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = '';
  form.name = '';
  form.icon = '';
  form.color = PRESET_COLORS[0];
  form.type = activeType.value;
  formError.value = '';
  modalOpen.value = true;
}

function openEdit(item) {
  editingId.value = item.id;
  form.name = item.name;
  form.icon = item.icon;
  form.color = /^#[0-9a-fA-F]{6}$/.test(item.color || '') ? item.color : PRESET_COLORS[0];
  form.type = normalizeType(item.type);
  formError.value = '';
  modalOpen.value = true;
}

async function save() {
  if (saving.value) return;
  const name = form.name.trim();
  if (!name) {
    formError.value = '请输入类目名称';
    return;
  }

  saving.value = true;
  formError.value = '';

  const payload = {
    name,
    icon: form.icon.trim() || '📦',
    color: form.color,
  };

  try {
    if (editingId.value) {
      await apiPut(`/categories/${editingId.value}`, payload);
    } else {
      await apiPost('/categories', { ...payload, type: form.type });
      activeType.value = form.type;
    }
    modalOpen.value = false;
    await load();
    emit('categories-changed');
  } catch (err) {
    formError.value = err.message;
  } finally {
    saving.value = false;
  }
}

function askDelete(item) {
  deleteError.value = '';
  deleteTarget.value = item;
}

async function confirmDelete() {
  if (!deleteTarget.value || deleting.value) return;
  deleting.value = true;
  deleteError.value = '';
  try {
    await apiDelete(`/categories/${deleteTarget.value.id}`);
    deleteTarget.value = null;
    await load();
    emit('categories-changed');
  } catch (err) {
    deleteError.value = err.message;
  } finally {
    deleting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div class="page-heading">
        <h1 class="page-title">类目管理</h1>
        <p class="page-subtitle">维护记账类目的名称、图标与颜色</p>
      </div>
      <button type="button" class="btn btn-primary" @click="openCreate">＋ 新增类目</button>
    </header>

    <section class="card">
      <div class="card-head">
        <div>
          <h2 class="card-title">{{ activeTypeLabel }}类目</h2>
          <p class="card-subtitle">共 {{ filteredItems.length }} 个{{ activeTypeLabel }}类目</p>
        </div>
        <div class="segmented">
          <button
            type="button"
            class="segmented-btn"
            :class="{ active: activeType === 'expense' }"
            @click="activeType = 'expense'"
          >
            支出类目 <span class="count">{{ typeCounts.expense }}</span>
          </button>
          <button
            type="button"
            class="segmented-btn is-income"
            :class="{ active: activeType === 'income' }"
            @click="activeType = 'income'"
          >
            收入类目 <span class="count">{{ typeCounts.income }}</span>
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading-text">加载中…</div>

      <div v-else-if="errorMsg" class="error-card">
        <div class="error-title">类目加载失败</div>
        <p class="error-detail">{{ errorMsg }}</p>
        <button type="button" class="btn btn-primary" @click="load">重试</button>
      </div>

      <div v-else-if="!filteredItems.length" class="empty-state">
        <span class="empty-icon">🏷️</span>
        <p>暂无{{ activeTypeLabel }}类目，点击右上角新增</p>
      </div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>图标</th>
            <th>名称</th>
            <th>颜色</th>
            <th>类型</th>
            <th>来源</th>
            <th class="actions-col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredItems" :key="item.id">
            <td>
              <span class="table-icon" :style="{ background: withAlpha(item.color, 0.14) }">
                {{ item.icon }}
              </span>
            </td>
            <td class="strong">{{ item.name }}</td>
            <td>
              <span class="color-cell">
                <span class="color-dot" :style="{ background: item.color }"></span>
                {{ item.color }}
              </span>
            </td>
            <td>
              <span class="tag" :class="normalizeType(item.type) === 'income' ? 'tag-income' : 'tag-expense'">
                {{ normalizeType(item.type) === 'income' ? '收入' : '支出' }}
              </span>
            </td>
            <td>
              <span class="tag" :class="item.isDefault ? 'tag-default' : 'tag-custom'">
                {{ item.isDefault ? '默认' : '自定义' }}
              </span>
            </td>
            <td>
              <div class="row-actions">
                <button type="button" class="btn btn-ghost btn-sm" @click="openEdit(item)">
                  编辑
                </button>
                <button type="button" class="btn btn-danger btn-sm" @click="askDelete(item)">
                  删除
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <AppModal
      v-if="modalOpen"
      :title="editingId ? '编辑类目' : '新增类目'"
      width="480px"
      @close="modalOpen = false"
    >
      <form id="category-form" class="category-form" @submit.prevent="save">
        <div class="form-group">
          <span class="form-label">类型</span>
          <div v-if="editingId" class="type-readonly">
            {{ form.type === 'income' ? '收入类目' : '支出类目' }}
          </div>
          <div v-else class="segmented type-select">
            <button
              type="button"
              class="segmented-btn"
              :class="{ active: form.type === 'expense' }"
              @click="form.type = 'expense'"
            >
              支出
            </button>
            <button
              type="button"
              class="segmented-btn is-income"
              :class="{ active: form.type === 'income' }"
              @click="form.type = 'income'"
            >
              收入
            </button>
          </div>
          <p v-if="editingId" class="form-hint">类型创建后不可修改</p>
        </div>

        <div class="form-group">
          <label class="form-label" for="category-name">名称</label>
          <input
            id="category-name"
            v-model="form.name"
            class="input"
            type="text"
            maxlength="10"
            placeholder="最多 10 个字"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="category-icon">图标</label>
          <input
            id="category-icon"
            v-model="form.icon"
            class="input"
            type="text"
            placeholder="如 🍜"
          />
          <p class="form-hint">留空默认使用 📦</p>
        </div>

        <div class="form-group">
          <span class="form-label">颜色</span>
          <div class="color-picker">
            <button
              v-for="color in PRESET_COLORS"
              :key="color"
              type="button"
              class="color-swatch"
              :class="{ active: form.color.toLowerCase() === color.toLowerCase() }"
              :style="{ background: color }"
              :aria-label="color"
              @click="form.color = color"
            ></button>
            <label class="color-custom">
              <input v-model="form.color" class="color-input" type="color" />
              <span>自定义</span>
            </label>
          </div>
        </div>

        <p v-if="formError" class="form-error">{{ formError }}</p>
      </form>

      <template #footer>
        <button type="button" class="btn btn-ghost" @click="modalOpen = false">取消</button>
        <button type="submit" form="category-form" class="btn btn-primary" :disabled="saving">
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </template>
    </AppModal>

    <AppModal v-if="deleteTarget" title="删除类目" width="420px" @close="deleteTarget = null">
      <p class="confirm-text">
        确定要删除类目「<strong>{{ deleteTarget.name }}</strong>」吗？删除后无法恢复。
      </p>
      <p v-if="deleteError" class="form-error confirm-error">{{ deleteError }}</p>

      <template #footer>
        <button type="button" class="btn btn-ghost" @click="deleteTarget = null">取消</button>
        <button type="button" class="btn btn-danger" :disabled="deleting" @click="confirmDelete">
          {{ deleting ? '删除中…' : '确认删除' }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 36px 20px;
  text-align: center;
}

.category-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.count {
  margin-left: 4px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(17, 31, 65, 0.08);
  font-size: 11px;
  font-weight: 600;
}

.segmented-btn.active .count {
  background: var(--primary-soft);
  color: var(--primary-strong);
}

.segmented-btn.is-income.active .count {
  background: var(--success-soft);
  color: var(--success);
}

.type-select {
  align-self: flex-start;
}

.type-readonly {
  padding: 10px 12px;
  border: 1.5px dashed var(--border);
  border-radius: 10px;
  background: #f8fafd;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 500;
}

.tag-expense {
  background: var(--danger-soft);
  color: var(--danger);
}

.tag-income {
  background: var(--success-soft);
  color: var(--success);
}

.color-picker {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.color-swatch {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 8px;
  outline: none;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.06);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.color-swatch:hover {
  transform: translateY(-1px);
}

.color-swatch.active {
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--primary);
}

.color-custom {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  color: var(--text-2);
  font-size: 12px;
  cursor: pointer;
}

.color-input {
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.confirm-text {
  font-size: 14px;
  color: var(--text);
}

.confirm-error {
  margin-top: 14px;
}
</style>
