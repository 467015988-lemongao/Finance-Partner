<script setup>
import { inject, onMounted, ref } from 'vue'
import { api } from '../api'
import RecordForm from '../components/RecordForm.vue'
import { currentMonthKey, formatMoney, formatTodayLabel } from '../utils/format'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  categoriesLoading: { type: Boolean, default: false },
  categoriesError: { type: String, default: '' },
  reloadCategories: { type: Function, default: null },
})

const emit = defineEmits(['go-profile'])
const toast = inject('toast', () => {})

const formRef = ref(null)
const saving = ref(false)
const summary = ref(null)
const summaryLoading = ref(true)
const summaryError = ref('')

const todayLabel = formatTodayLabel()
const monthKey = currentMonthKey()

async function loadSummary() {
  summaryLoading.value = true
  summaryError.value = ''
  try {
    summary.value = await api.getSummary(monthKey)
  } catch (error) {
    summary.value = null
    summaryError.value = error.message
  } finally {
    summaryLoading.value = false
  }
}

async function handleSubmit(payload) {
  saving.value = true
  try {
    await api.createRecord(payload)
    toast('记账成功')
    formRef.value?.resetAfterSave()
    await loadSummary()
  } catch (error) {
    toast(error.message)
  } finally {
    saving.value = false
  }
}

function retryCategories() {
  if (typeof props.reloadCategories === 'function') props.reloadCategories()
}

onMounted(loadSummary)
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title">记一笔</h1>
        <p class="page-sub">{{ todayLabel }}</p>
      </div>
    </header>

    <section class="card">
      <div v-if="categoriesLoading" class="form-skeleton">
        <div class="skeleton" style="height: 62px"></div>
        <div class="skeleton" style="height: 150px"></div>
        <div class="skeleton" style="height: 46px"></div>
        <div class="skeleton" style="height: 50px"></div>
      </div>

      <div v-else-if="categoriesError && !categories.length" class="state-block inline">
        <span class="state-emoji">😵</span>
        <p class="state-title">类目加载失败</p>
        <p class="state-desc">{{ categoriesError }}</p>
        <button type="button" class="state-action" @click="retryCategories">重试</button>
      </div>

      <div v-else-if="!categories.length" class="state-block inline">
        <span class="state-emoji">🗂️</span>
        <p class="state-title">暂无可用类目</p>
        <p class="state-desc">先到「我的」新增一个记账类目吧</p>
        <button type="button" class="state-action" @click="emit('go-profile')">去新增类目</button>
      </div>

      <RecordForm
        v-else
        ref="formRef"
        :categories="categories"
        :submitting="saving"
        submit-label="保存"
        @submit="handleSubmit"
        @error="toast"
      />
    </section>

    <div class="summary-line">
      <template v-if="summaryLoading">本月统计加载中…</template>
      <template v-else-if="summaryError">
        本月统计加载失败
        <button type="button" class="link-btn" @click="loadSummary">重试</button>
      </template>
      <template v-else-if="summary">
        本月已记 {{ summary.count }} 笔 · 合计 ¥{{ formatMoney(summary.total) }}
      </template>
      <template v-else>本月暂无记录</template>
    </div>
  </div>
</template>

<style scoped>
.form-skeleton {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.state-block.inline {
  padding: 24px 12px;
  box-shadow: none;
  background: transparent;
}

.summary-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 2px 0 4px;
  font-size: 13px;
  color: var(--muted);
  text-align: center;
}
</style>
