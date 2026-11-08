<script setup>
import { computed, inject, ref } from 'vue'
import { api } from '../api'
import BottomSheet from '../components/BottomSheet.vue'
import CategoryForm from '../components/CategoryForm.vue'
import ConfirmSheet from '../components/ConfirmSheet.vue'
import { hexToRgba } from '../utils/format'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  reload: { type: Function, default: null },
})

const toast = inject('toast', () => {})

const type = ref('expense')
const formType = ref('expense')
const showForm = ref(false)
const editingCategory = ref(null)
const saving = ref(false)

const typeLabel = computed(() => (type.value === 'income' ? '收入' : '支出'))
const visibleCategories = computed(() =>
  props.categories.filter((category) =>
    (category.type === 'income' ? 'income' : 'expense') === type.value,
  ),
)

const pendingDelete = ref(null)
const deleting = ref(false)

const deleteMessage = computed(() =>
  pendingDelete.value
    ? `确定删除类目「${pendingDelete.value.name}」吗？删除后不可恢复。`
    : '',
)

function reloadCategories() {
  if (typeof props.reload === 'function') return props.reload()
  return Promise.resolve()
}

function openAdd() {
  editingCategory.value = null
  formType.value = type.value
  showForm.value = true
}

function openEdit(category) {
  editingCategory.value = category
  showForm.value = true
}

function closeForm() {
  if (!saving.value) showForm.value = false
}

async function handleSave(payload) {
  saving.value = true
  try {
    const isEdit = Boolean(editingCategory.value)
    if (isEdit) {
      await api.updateCategory(editingCategory.value.id, payload)
    } else {
      await api.createCategory(payload)
    }
    showForm.value = false
    toast(isEdit ? '类目已更新' : '类目已添加')
    await reloadCategories()
  } catch (err) {
    toast(err.message)
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    await api.deleteCategory(pendingDelete.value.id)
    pendingDelete.value = null
    toast('类目已删除')
    await reloadCategories()
  } catch (err) {
    pendingDelete.value = null
    toast(err.message)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title">我的</h1>
        <p class="page-sub">自定义你的记账类目</p>
      </div>
    </header>

    <div class="segmented" role="group" aria-label="类目类型">
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

    <button type="button" class="btn-primary" @click="openAdd">
      ＋ 新增{{ typeLabel }}类目
    </button>

    <div class="list-head">
      <span>{{ typeLabel }}类目</span>
      <span class="list-count">{{ visibleCategories.length }} 个</span>
    </div>

    <div v-if="loading" class="category-card card">
      <div v-for="n in 4" :key="n" class="skeleton category-skeleton"></div>
    </div>

    <div v-else-if="error" class="state-block">
      <span class="state-emoji">😵</span>
      <p class="state-title">类目加载失败</p>
      <p class="state-desc">{{ error }}</p>
      <button type="button" class="state-action" @click="reloadCategories">重试</button>
    </div>

    <div v-else-if="!visibleCategories.length" class="state-block">
      <span class="state-emoji">🗂️</span>
      <p class="state-title">暂无{{ typeLabel }}类目</p>
      <p class="state-desc">新增一个{{ typeLabel }}类目，开始记录你的收支</p>
      <button type="button" class="state-action" @click="openAdd">
        新增{{ typeLabel }}类目
      </button>
    </div>

    <div v-else class="category-card card">
      <div v-for="category in visibleCategories" :key="category.id" class="category-row">
        <div
          class="cat-avatar"
          :style="{
            backgroundColor: hexToRgba(category.color, 0.16),
            color: category.color,
          }"
        >
          {{ category.icon }}
        </div>
        <div class="cat-info">
          <div class="cat-name">{{ category.name }}</div>
          <span class="cat-tag" :class="{ custom: !category.isDefault }">
            {{ category.isDefault ? '默认' : '自定义' }}
          </span>
        </div>
        <div class="cat-actions">
          <button type="button" class="icon-btn" @click="openEdit(category)">编辑</button>
          <button type="button" class="icon-btn danger" @click="pendingDelete = category">
            删除
          </button>
        </div>
      </div>
    </div>

    <p class="hint-line">类目下存在账目记录时无法删除</p>

    <BottomSheet
      :open="showForm"
      :title="editingCategory ? '编辑类目' : '新增类目'"
      @close="closeForm"
    >
      <CategoryForm
        :initial="editingCategory"
        :default-type="formType"
        :submitting="saving"
        :submit-label="editingCategory ? '保存修改' : '添加类目'"
        @submit="handleSave"
        @error="toast"
      />
    </BottomSheet>

    <ConfirmSheet
      :open="Boolean(pendingDelete)"
      title="删除类目"
      :message="deleteMessage"
      confirm-text="删除"
      :busy="deleting"
      @cancel="pendingDelete = null"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.list-count {
  color: var(--muted);
  font-weight: 500;
}

.category-card {
  display: flex;
  flex-direction: column;
  padding-top: 4px;
  padding-bottom: 4px;
}

.category-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}

.category-row:last-child {
  border-bottom: 0;
}

.cat-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  font-size: 21px;
}

.cat-info {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.cat-name {
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-tag {
  align-self: flex-start;
  padding: 1px 7px;
  border-radius: 6px;
  background: var(--bg-soft);
  color: var(--muted);
  font-size: 11px;
  line-height: 1.5;
}

.cat-tag.custom {
  background: var(--primary-soft);
  color: var(--primary);
}

.cat-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.category-skeleton {
  height: 52px;
  margin: 8px 0;
}
</style>
