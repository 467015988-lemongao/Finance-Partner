<script setup>
import { onMounted, ref } from 'vue';
import SideNav from './components/SideNav.vue';
import AddRecord from './pages/AddRecord.vue';
import RecordsPage from './pages/RecordsPage.vue';
import StatsPage from './pages/StatsPage.vue';
import CategoriesPage from './pages/CategoriesPage.vue';
import { apiGet } from './api';

const navItems = [
  { key: 'add', label: '记账', icon: '➕' },
  { key: 'records', label: '账目明细', icon: '📋' },
  { key: 'stats', label: '统计分析', icon: '📊' },
  { key: 'categories', label: '类目管理', icon: '🏷️' },
];

const activePage = ref('add');
const categories = ref([]);
const loading = ref(true);
const errorMsg = ref('');
const reloadKey = ref(0);

async function loadCategories(silent = false) {
  if (!silent) {
    loading.value = true;
    errorMsg.value = '';
  }
  try {
    const data = await apiGet('/categories');
    categories.value = data.items || [];
    if (!silent) errorMsg.value = '';
  } catch (err) {
    if (silent) return;
    errorMsg.value = err.message;
  } finally {
    if (!silent) loading.value = false;
  }
}

function selectPage(key) {
  if (key === activePage.value) {
    reloadKey.value += 1;
    return;
  }
  activePage.value = key;
}

function retry() {
  reloadKey.value += 1;
  loadCategories();
}

function handleCategoriesChanged() {
  loadCategories(true);
}

onMounted(() => loadCategories());
</script>

<template>
  <div class="app-shell">
    <SideNav :items="navItems" :active="activePage" @select="selectPage" />

    <main class="app-main">
      <div class="app-content">
        <div v-if="loading" class="state-card">加载中…</div>

        <div v-else-if="errorMsg" class="state-card error-card">
          <div class="error-title">数据加载失败</div>
          <p class="error-detail">{{ errorMsg }}</p>
          <button type="button" class="btn btn-primary" @click="retry">重试</button>
        </div>

        <template v-else>
          <AddRecord
            v-if="activePage === 'add'"
            :key="`add-${reloadKey}`"
            :categories="categories"
          />
          <RecordsPage
            v-else-if="activePage === 'records'"
            :key="`records-${reloadKey}`"
            :categories="categories"
          />
          <StatsPage v-else-if="activePage === 'stats'" :key="`stats-${reloadKey}`" />
          <CategoriesPage
            v-else
            :key="`categories-${reloadKey}`"
            @categories-changed="handleCategoriesChanged"
          />
        </template>
      </div>
    </main>
  </div>
</template>
