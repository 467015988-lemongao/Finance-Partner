<script setup>
import { onMounted, provide, reactive, ref } from 'vue'
import { api } from './api'
import TabBar from './components/TabBar.vue'
import AddPage from './pages/AddPage.vue'
import RecordsPage from './pages/RecordsPage.vue'
import StatsPage from './pages/StatsPage.vue'
import ProfilePage from './pages/ProfilePage.vue'

const page = ref('add')

const categories = ref([])
const categoriesLoading = ref(true)
const categoriesError = ref('')

const toast = reactive({ visible: false, message: '' })
let toastTimer = null

function showToast(message) {
  toast.message = String(message || '操作失败')
  toast.visible = true
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.visible = false
  }, 2200)
}

async function loadCategories() {
  categoriesLoading.value = true
  categoriesError.value = ''
  try {
    const data = await api.getCategories()
    categories.value = data.items || []
  } catch (err) {
    categoriesError.value = err.message
  } finally {
    categoriesLoading.value = false
  }
}

provide('toast', showToast)

onMounted(loadCategories)
</script>

<template>
  <div class="app-shell">
    <div v-if="categoriesError" class="global-error" role="alert">
      <span class="global-error-text">⚠️ {{ categoriesError }}</span>
      <button type="button" class="global-error-retry" @click="loadCategories">重试</button>
    </div>

    <AddPage
      v-if="page === 'add'"
      :categories="categories"
      :categories-loading="categoriesLoading"
      :categories-error="categoriesError"
      :reload-categories="loadCategories"
      @go-profile="page = 'profile'"
    />
    <RecordsPage
      v-else-if="page === 'records'"
      :categories="categories"
      @go-add="page = 'add'"
    />
    <StatsPage v-else-if="page === 'stats'" />
    <ProfilePage
      v-else
      :categories="categories"
      :loading="categoriesLoading"
      :error="categoriesError"
      :reload="loadCategories"
    />
  </div>

  <TabBar :active="page" @change="page = $event" />

  <Teleport to="body">
    <Transition name="toast">
      <div v-if="toast.visible" class="toast" role="status">{{ toast.message }}</div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.global-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 13px;
}

.global-error-text {
  flex: 1;
  line-height: 1.4;
  word-break: break-all;
}

.global-error-retry {
  flex-shrink: 0;
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 10px;
  background: var(--danger);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: calc(84px + env(safe-area-inset-bottom));
  z-index: 400;
  max-width: min(80vw, 420px);
  padding: 11px 18px;
  border-radius: 14px;
  background: rgba(17, 20, 26, 0.92);
  color: #fff;
  font-size: 14px;
  line-height: 1.4;
  text-align: center;
  transform: translateX(-50%);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>
