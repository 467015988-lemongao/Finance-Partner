<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import AppModal from '../components/AppModal.vue';
import RecordForm from '../components/RecordForm.vue';
import { apiDelete, apiGet, apiPut } from '../api';
import {
  currentMonth,
  formatDateLabel,
  formatMonthLabel,
  formatMoney,
  shiftMonth,
  withAlpha,
} from '../utils/format';

const props = defineProps({
  categories: { type: Array, default: () => [] },
});

const month = ref(currentMonth());
const categoryId = ref('');
const typeFilter = ref('');
const keywordInput = ref('');
const keyword = ref('');
const records = ref([]);
const expenseTotal = ref(0);
const incomeTotal = ref(0);
const loading = ref(true);
const errorMsg = ref('');

const editing = ref(null);
const editError = ref('');
const editSaving = ref(false);

const deleteTarget = ref(null);
const deleteError = ref('');
const deleting = ref(false);

let requestSeq = 0;
let keywordTimer = null;
let destroyed = false;

const monthLabel = computed(() => formatMonthLabel(month.value));
const categoryMap = computed(
  () => new Map(props.categories.map((category) => [category.id, category])),
);
const balance = computed(() => incomeTotal.value - expenseTotal.value);
const balanceText = computed(() => {
  const value = balance.value;
  return value < 0 ? `-¥${formatMoney(Math.abs(value))}` : `¥${formatMoney(value)}`;
});

function categoryOf(id) {
  return categoryMap.value.get(id) || { name: '未知类目', icon: '❔', color: '#8c8c8c' };
}

const groupedRecords = computed(() => {
  const groups = [];
  const map = new Map();
  for (const record of records.value) {
    let group = map.get(record.date);
    if (!group) {
      group = { date: record.date, items: [], subtotal: 0 };
      map.set(record.date, group);
      groups.push(group);
    }
    group.items.push(record);
    group.subtotal += Number(record.amount) || 0;
  }
  return groups.sort((a, b) => b.date.localeCompare(a.date));
});

async function loadRecords() {
  const seq = ++requestSeq;
  loading.value = true;
  errorMsg.value = '';

  const params = new URLSearchParams();
  params.set('month', month.value);
  if (typeFilter.value) params.set('type', typeFilter.value);
  if (categoryId.value) params.set('categoryId', categoryId.value);
  if (keyword.value.trim()) params.set('keyword', keyword.value.trim());

  try {
    const data = await apiGet(`/records?${params.toString()}`);
    if (seq !== requestSeq || destroyed) return;
    records.value = data.items || [];
    expenseTotal.value = Number(data.expenseTotal) || 0;
    incomeTotal.value = Number(data.incomeTotal) || 0;
  } catch (err) {
    if (seq !== requestSeq || destroyed) return;
    records.value = [];
    expenseTotal.value = 0;
    incomeTotal.value = 0;
    errorMsg.value = err.message;
  } finally {
    if (seq === requestSeq && !destroyed) loading.value = false;
  }
}

function changeMonth(delta) {
  month.value = shiftMonth(month.value, delta);
}

function onKeywordInput(event) {
  keywordInput.value = event.target.value;
  keyword.value = event.target.value;
  clearTimeout(keywordTimer);
  keywordTimer = setTimeout(() => loadRecords(), 300);
}

function searchNow() {
  clearTimeout(keywordTimer);
  keyword.value = keywordInput.value;
  loadRecords();
}

function openEdit(record) {
  editError.value = '';
  editing.value = record;
}

async function saveEdit(payload) {
  if (!editing.value) return;
  editSaving.value = true;
  editError.value = '';
  try {
    await apiPut(`/records/${editing.value.id}`, payload);
    editing.value = null;
    await loadRecords();
  } catch (err) {
    editError.value = err.message;
  } finally {
    editSaving.value = false;
  }
}

function askDelete(record) {
  deleteError.value = '';
  deleteTarget.value = record;
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  deleteError.value = '';
  try {
    await apiDelete(`/records/${deleteTarget.value.id}`);
    deleteTarget.value = null;
    await loadRecords();
  } catch (err) {
    deleteError.value = err.message;
  } finally {
    deleting.value = false;
  }
}

watch([month, categoryId, typeFilter], () => loadRecords());

onMounted(loadRecords);

onUnmounted(() => {
  destroyed = true;
  clearTimeout(keywordTimer);
});
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div class="page-heading">
        <h1 class="page-title">账目明细</h1>
        <p class="page-subtitle">按月查看、筛选与维护每一笔账目</p>
      </div>
      <div class="month-switch">
        <button type="button" class="month-btn" aria-label="上一月" @click="changeMonth(-1)">
          ‹
        </button>
        <span class="month-label">{{ monthLabel }}</span>
        <button type="button" class="month-btn" aria-label="下一月" @click="changeMonth(1)">
          ›
        </button>
      </div>
    </header>

    <div class="card toolbar-card">
      <div class="toolbar">
        <div class="toolbar-field">
          <span class="toolbar-label">类型</span>
          <div class="segmented type-filter">
            <button
              type="button"
              class="segmented-btn"
              :class="{ active: typeFilter === '' }"
              @click="typeFilter = ''"
            >
              全部
            </button>
            <button
              type="button"
              class="segmented-btn"
              :class="{ active: typeFilter === 'expense' }"
              @click="typeFilter = 'expense'"
            >
              支出
            </button>
            <button
              type="button"
              class="segmented-btn is-income"
              :class="{ active: typeFilter === 'income' }"
              @click="typeFilter = 'income'"
            >
              收入
            </button>
          </div>
        </div>

        <div class="toolbar-field">
          <label class="toolbar-label" for="category-filter">类目</label>
          <select id="category-filter" v-model="categoryId" class="select category-select">
            <option value="">全部类目</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.icon }} {{ category.name }}
            </option>
          </select>
        </div>

        <div class="toolbar-field">
          <label class="toolbar-label" for="keyword-search">关键词</label>
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              id="keyword-search"
              class="input search-input"
              type="text"
              :value="keywordInput"
              placeholder="搜索备注…"
              @input="onKeywordInput"
              @keyup.enter="searchNow"
            />
          </div>
        </div>

        <div class="toolbar-summary">
          <div class="summary-item">
            <span class="summary-label">支出合计</span>
            <strong class="summary-value is-expense">¥{{ formatMoney(expenseTotal) }}</strong>
          </div>
          <div class="summary-item">
            <span class="summary-label">收入合计</span>
            <strong class="summary-value is-income">¥{{ formatMoney(incomeTotal) }}</strong>
          </div>
          <div class="summary-item">
            <span class="summary-label">结余</span>
            <strong
              class="summary-value"
              :class="balance < 0 ? 'is-expense' : 'is-income'"
            >
              {{ balanceText }}
            </strong>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="state-card">加载中…</div>

    <div v-else-if="errorMsg" class="state-card error-card">
      <div class="error-title">账目加载失败</div>
      <p class="error-detail">{{ errorMsg }}</p>
      <button type="button" class="btn btn-primary" @click="loadRecords">重试</button>
    </div>

    <div v-else-if="!records.length" class="card">
      <div class="empty-state">
        <span class="empty-icon">📭</span>
        <p>暂无账目记录</p>
      </div>
    </div>

    <div v-else class="record-groups">
      <section v-for="group in groupedRecords" :key="group.date" class="record-group">
        <div class="group-head">
          <span class="group-date">{{ formatDateLabel(group.date) }}</span>
          <span class="group-subtotal">
            当日小计 <strong>¥{{ formatMoney(group.subtotal) }}</strong>
          </span>
        </div>

        <div class="card group-card">
          <div v-for="record in group.items" :key="record.id" class="record-row">
            <span
              class="record-icon"
              :style="{ background: withAlpha(categoryOf(record.categoryId).color, 0.14) }"
            >
              {{ categoryOf(record.categoryId).icon }}
            </span>

            <div class="record-main">
              <div class="record-title">{{ categoryOf(record.categoryId).name }}</div>
              <div class="record-note" :class="{ 'is-empty': !record.note }">
                {{ record.note || '—' }}
              </div>
            </div>

            <div class="record-date">{{ record.date }}</div>
            <div class="record-amount" :class="{ 'is-income': record.type === 'income' }">
              {{ record.type === 'income' ? '+' : '-' }}¥{{ formatMoney(record.amount) }}
            </div>

            <div class="record-actions">
              <button type="button" class="btn btn-ghost btn-sm" @click="openEdit(record)">
                编辑
              </button>
              <button type="button" class="btn btn-danger btn-sm" @click="askDelete(record)">
                删除
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <AppModal v-if="editing" title="编辑账目" width="520px" @close="editing = null">
      <RecordForm
        :key="editing.id"
        :categories="categories"
        :initial="editing"
        submit-text="保存修改"
        show-cancel
        :submitting="editSaving"
        :server-error="editError"
        @submit="saveEdit"
        @cancel="editing = null"
      />
    </AppModal>

    <AppModal v-if="deleteTarget" title="删除账目" width="420px" @close="deleteTarget = null">
      <p class="confirm-text">确定要删除这条账目吗？删除后无法恢复。</p>
      <div class="confirm-summary">
        <span>{{ categoryOf(deleteTarget.categoryId).icon }} {{ categoryOf(deleteTarget.categoryId).name }}</span>
        <strong :class="{ 'is-income': deleteTarget.type === 'income' }">
          {{ deleteTarget.type === 'income' ? '+' : '-' }}¥{{ formatMoney(deleteTarget.amount) }}
        </strong>
      </div>
      <p class="muted confirm-date">
        {{ formatDateLabel(deleteTarget.date) }}
        <span v-if="deleteTarget.note"> · {{ deleteTarget.note }}</span>
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
.toolbar-card {
  padding: 16px 20px;
}

.toolbar {
  display: flex;
  align-items: flex-end;
  gap: 18px;
  flex-wrap: wrap;
}

.toolbar-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.toolbar-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.category-select {
  width: 190px;
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
  font-size: 13px;
  opacity: 0.65;
  pointer-events: none;
}

.search-input {
  width: 260px;
  padding-left: 34px;
}

.toolbar-summary {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  margin-left: auto;
  padding-bottom: 3px;
  flex-wrap: wrap;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-label {
  color: var(--text-muted);
  font-size: 12px;
}

.summary-value {
  color: var(--text);
  font-size: 17px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.summary-value.is-expense {
  color: var(--danger);
}

.summary-value.is-income {
  color: var(--success);
}

.record-groups {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.group-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 0 4px 8px;
}

.group-date {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-2);
}

.group-subtotal {
  color: var(--text-muted);
  font-size: 12px;
}

.group-subtotal strong {
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}

.group-card {
  padding: 4px 20px;
}

.record-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 92px 108px auto;
  align-items: center;
  gap: 14px;
  padding: 13px 0;
  border-bottom: 1px solid #f0f2f7;
}

.record-row:last-child {
  border-bottom: none;
}

.record-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  font-size: 19px;
}

.record-main {
  min-width: 0;
}

.record-title {
  font-size: 14px;
  font-weight: 600;
}

.record-note {
  overflow: hidden;
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-note.is-empty {
  color: #c3cad8;
}

.record-date {
  color: var(--text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.record-amount {
  color: var(--danger);
  font-size: 15px;
  font-weight: 700;
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.record-amount.is-income {
  color: var(--success);
}

.record-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.confirm-text {
  font-size: 14px;
  color: var(--text);
}

.confirm-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f8fafd;
  font-size: 14px;
}

.confirm-summary strong {
  color: var(--danger);
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}

.confirm-summary strong.is-income {
  color: var(--success);
}

.confirm-date {
  margin-top: 10px;
  font-size: 12px;
}

.confirm-error {
  margin-top: 12px;
}

@media (max-width: 900px) {
  .record-row {
    grid-template-columns: 40px minmax(0, 1fr) 92px;
  }

  .record-date {
    display: none;
  }

  .record-actions {
    grid-column: 2 / -1;
    justify-content: flex-start;
  }
}
</style>
