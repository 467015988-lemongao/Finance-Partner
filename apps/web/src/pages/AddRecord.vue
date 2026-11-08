<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import RecordForm from '../components/RecordForm.vue';
import { apiGet, apiPost } from '../api';
import {
  currentMonth,
  formatDateLabel,
  formatMonthLabel,
  formatMoney,
  withAlpha,
} from '../utils/format';

const props = defineProps({
  categories: { type: Array, default: () => [] },
});

const formRef = ref(null);
const submitting = ref(false);
const submitError = ref('');
const success = ref('');
let successTimer = null;

const recent = ref([]);
const recentLoading = ref(true);
const recentError = ref('');

const monthKey = currentMonth();
const monthLabel = computed(() => formatMonthLabel(monthKey));
const categoryMap = computed(
  () => new Map(props.categories.map((category) => [category.id, category])),
);

function categoryOf(categoryId) {
  return categoryMap.value.get(categoryId) || { name: '未知类目', icon: '❔', color: '#8c8c8c' };
}

async function loadRecent() {
  recentLoading.value = true;
  recentError.value = '';
  try {
    const data = await apiGet(`/records?month=${monthKey}`);
    recent.value = (data.items || []).slice(0, 8);
  } catch (err) {
    recent.value = [];
    recentError.value = err.message;
  } finally {
    recentLoading.value = false;
  }
}

async function handleSubmit(payload) {
  submitting.value = true;
  submitError.value = '';
  try {
    await apiPost('/records', payload);
    formRef.value?.reset();
    success.value = '记账成功';
    clearTimeout(successTimer);
    successTimer = setTimeout(() => {
      success.value = '';
    }, 3000);
    await loadRecent();
  } catch (err) {
    submitError.value = err.message;
  } finally {
    submitting.value = false;
  }
}

onMounted(loadRecent);
onUnmounted(() => clearTimeout(successTimer));
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div class="page-heading">
        <h1 class="page-title">记账</h1>
        <p class="page-subtitle">记录每一笔收入与支出，掌握每日收支</p>
      </div>
      <span class="month-badge">{{ monthLabel }}</span>
    </header>

    <div v-if="success" class="success-banner">✅ {{ success }}</div>

    <div class="add-layout">
      <section class="card">
        <div class="card-head">
          <div>
            <h2 class="card-title">新增账目</h2>
            <p class="card-subtitle">填写金额与类目，快速完成记账</p>
          </div>
        </div>
        <RecordForm
          ref="formRef"
          :categories="categories"
          submit-text="保存账目"
          :submitting="submitting"
          :server-error="submitError"
          @submit="handleSubmit"
        />
      </section>

      <section class="card recent-card">
        <div class="card-head">
          <div>
            <h2 class="card-title">本月最近账目</h2>
            <p class="card-subtitle">最近 8 条记录</p>
          </div>
          <span class="muted">{{ monthLabel }}</span>
        </div>

        <div v-if="recentLoading" class="loading-text">加载中…</div>

        <div v-else-if="recentError" class="recent-error">
          <p class="form-error">{{ recentError }}</p>
          <button type="button" class="btn btn-ghost btn-sm" @click="loadRecent">重试</button>
        </div>

        <div v-else-if="!recent.length" class="empty-state">
          <span class="empty-icon">🧾</span>
          <p>本月还没有账目，先记一笔吧</p>
        </div>

        <ul v-else class="recent-list">
          <li v-for="record in recent" :key="record.id" class="recent-item">
            <span
              class="recent-icon"
              :style="{ background: withAlpha(categoryOf(record.categoryId).color, 0.14) }"
            >
              {{ categoryOf(record.categoryId).icon }}
            </span>
            <div class="recent-main">
              <div class="recent-top">
                <span class="recent-cat">{{ categoryOf(record.categoryId).name }}</span>
                <span
                  class="recent-amount"
                  :class="{ 'is-income': record.type === 'income' }"
                >
                  {{ record.type === 'income' ? '+' : '-' }}¥{{ formatMoney(record.amount) }}
                </span>
              </div>
              <div class="recent-meta">
                <span>{{ formatDateLabel(record.date) }}</span>
                <span class="recent-note" :class="{ 'is-empty': !record.note }">
                  {{ record.note || '—' }}
                </span>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.month-badge {
  padding: 8px 16px;
  border-radius: 999px;
  background: #fff;
  box-shadow: var(--shadow);
  color: var(--text-2);
  font-size: 13px;
  font-weight: 600;
}

.add-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 24px;
  align-items: start;
}

.recent-card {
  position: sticky;
  top: 32px;
}

.recent-error {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 6px;
  border-bottom: 1px solid #f0f2f7;
}

.recent-item:last-child {
  border-bottom: none;
}

.recent-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  font-size: 19px;
  flex-shrink: 0;
}

.recent-main {
  flex: 1;
  min-width: 0;
}

.recent-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.recent-cat {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.recent-amount {
  color: var(--danger);
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.recent-amount.is-income {
  color: var(--success);
}

.recent-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 12px;
}

.recent-note {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-note.is-empty {
  color: #c3cad8;
}

@media (max-width: 1100px) {
  .add-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .recent-card {
    position: static;
  }
}
</style>
