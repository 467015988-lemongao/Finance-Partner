<script setup>
import { computed, inject, onMounted, ref, watch } from 'vue'
import { api } from '../api'
import BottomSheet from '../components/BottomSheet.vue'
import ConfirmSheet from '../components/ConfirmSheet.vue'
import MonthSwitcher from '../components/MonthSwitcher.vue'
import RecordForm from '../components/RecordForm.vue'
import RecordItem from '../components/RecordItem.vue'
import {
  currentMonthKey,
  formatDateLabel,
  formatMoney,
  formatMonthLabel,
  shiftMonthKey,
} from '../utils/format'

const props = defineProps({
  categories: { type: Array, default: () => [] },
})

defineEmits(['go-add'])

const toast = inject('toast', () => {})

const monthKey = ref(currentMonthKey())
const records = ref([])
const total = ref(0)
const loading = ref(true)
const error = ref('')

const editingRecord = ref(null)
const saving = ref(false)

const pendingDelete = ref(null)
const deleting = ref(false)

const categoryMap = computed(() => {
  const map = {}
  for (const category of props.categories) {
    map[category.id] = category
  }
  return map
})

const groups = computed(() => {
  const map = new Map()
  for (const record of records.value) {
    const list = map.get(record.date) || []
    list.push(record)
    map.set(record.date, list)
  }
  return Array.from(map.entries()).map(([date, items]) => ({
    date,
    items,
    total: items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
  }))
})

const deleteMessage = computed(() => {
  if (!pendingDelete.value) return ''
  const category = categoryMap.value[pendingDelete.value.categoryId]
  const name = category ? category.name : '未知类目'
  return `确定删除「${name} ¥${formatMoney(pendingDelete.value.amount)}」这笔记录吗？删除后不可恢复。`
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await api.getRecords({ month: monthKey.value })
    records.value = data.items || []
    total.value = Number(data.total) || 0
  } catch (err) {
    records.value = []
    total.value = 0
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function shiftMonth(delta) {
  monthKey.value = shiftMonthKey(monthKey.value, delta)
}

function openEdit(record) {
  editingRecord.value = record
}

function closeEdit() {
  if (!saving.value) editingRecord.value = null
}

async function handleUpdate(payload) {
  if (!editingRecord.value) return
  saving.value = true
  try {
    await api.updateRecord(editingRecord.value.id, payload)
    editingRecord.value = null
    toast('已保存')
    await load()
  } catch (err) {
    toast(err.message)
  } finally {
    saving.value = false
  }
}

function askDelete(record) {
  pendingDelete.value = record
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    await api.deleteRecord(pendingDelete.value.id)
    pendingDelete.value = null
    toast('已删除')
    await load()
  } catch (err) {
    pendingDelete.value = null
    toast(err.message)
  } finally {
    deleting.value = false
  }
}

watch(monthKey, load)
onMounted(load)
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title">明细</h1>
        <p class="page-sub">按月查看每一笔支出</p>
      </div>
    </header>

    <MonthSwitcher :month="monthKey" @shift="shiftMonth" />

    <section class="total-card card">
      <span class="total-label">{{ formatMonthLabel(monthKey) }}合计</span>
      <strong class="total-value">¥{{ formatMoney(total) }}</strong>
      <span class="total-sub">共 {{ records.length }} 笔</span>
    </section>

    <div v-if="loading" class="day-groups">
      <div class="skeleton skeleton-head"></div>
      <div v-for="n in 3" :key="n" class="skeleton skeleton-row"></div>
    </div>

    <div v-else-if="error" class="state-block">
      <span class="state-emoji">😵</span>
      <p class="state-title">加载失败</p>
      <p class="state-desc">{{ error }}</p>
      <button type="button" class="state-action" @click="load">重试</button>
    </div>

    <div v-else-if="!records.length" class="state-block">
      <span class="state-emoji">🧾</span>
      <p class="state-title">暂无账目记录</p>
      <p class="state-desc">记录第一笔支出，开始管理你的钱包</p>
      <button type="button" class="state-action" @click="$emit('go-add')">去记一笔</button>
    </div>

    <div v-else class="day-groups">
      <section v-for="group in groups" :key="group.date" class="day-group">
        <div class="day-head">
          <span>{{ formatDateLabel(group.date) }}</span>
          <span>¥{{ formatMoney(group.total) }}</span>
        </div>
        <div class="day-list">
          <RecordItem
            v-for="record in group.items"
            :key="record.id"
            :record="record"
            :category="categoryMap[record.categoryId]"
            @edit="openEdit"
            @delete="askDelete"
          />
        </div>
      </section>
      <p class="hint-line">左滑单条记录可删除，点击记录可编辑</p>
    </div>

    <BottomSheet :open="Boolean(editingRecord)" title="编辑账目" @close="closeEdit">
      <RecordForm
        v-if="editingRecord"
        :key="editingRecord.id"
        :initial="editingRecord"
        :categories="categories"
        :submitting="saving"
        submit-label="保存修改"
        @submit="handleUpdate"
        @error="toast"
      />
    </BottomSheet>

    <ConfirmSheet
      :open="Boolean(pendingDelete)"
      title="删除账目"
      :message="deleteMessage"
      confirm-text="删除"
      :busy="deleting"
      @cancel="pendingDelete = null"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.total-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.total-label {
  font-size: 13px;
  color: var(--muted);
}

.total-value {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.15;
}

.total-sub {
  font-size: 12px;
  color: var(--muted);
}

.day-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.day-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.day-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 4px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}

.day-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-head {
  height: 20px;
  width: 55%;
  margin: 4px 0;
}

.skeleton-row {
  height: 66px;
}
</style>
