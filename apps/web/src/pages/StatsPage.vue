<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { apiGet } from '../api';
import {
  currentMonth,
  formatMoney,
  formatMonthLabel,
  shiftMonth,
} from '../utils/format';

echarts.use([
  BarChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

const month = ref(currentMonth());
const loading = ref(true);
const errorMsg = ref('');
const summary = ref(null);
const categoryItems = ref([]);
const dailyItems = ref([]);
const monthlyItems = ref([]);

const pieEl = ref(null);
const dailyEl = ref(null);
const monthlyEl = ref(null);

let pieChart = null;
let dailyChart = null;
let monthlyChart = null;
let requestSeq = 0;
let destroyed = false;

const monthLabel = computed(() => formatMonthLabel(month.value));
const hasData = computed(() => Number(summary.value?.count || 0) > 0);
const hasMonthlyData = computed(() =>
  monthlyItems.value.some((item) => Number(item.total) > 0),
);

const changePercent = computed(() => summary.value?.changePercent ?? null);

const changeText = computed(() => {
  const value = changePercent.value;
  if (value === null || value === undefined) return '上月无支出';
  if (value > 0) return `↑ ${value.toFixed(1)}%`;
  if (value < 0) return `↓ ${Math.abs(value).toFixed(1)}%`;
  return '持平 0.0%';
});

const changeClass = computed(() => {
  const value = changePercent.value;
  if (value === null || value === undefined || value === 0) return 'is-flat';
  return value > 0 ? 'is-up' : 'is-down';
});

async function loadData() {
  const seq = ++requestSeq;
  disposeAllCharts();
  loading.value = true;
  errorMsg.value = '';

  try {
    const [summaryData, categoryData, dailyData, monthlyData] = await Promise.all([
      apiGet(`/stats/summary?month=${month.value}`),
      apiGet(`/stats/by-category?month=${month.value}`),
      apiGet(`/stats/daily?month=${month.value}`),
      apiGet(`/stats/monthly?endMonth=${month.value}&months=6`),
    ]);

    if (seq !== requestSeq || destroyed) return;

    summary.value = summaryData;
    categoryItems.value = categoryData.items || [];
    dailyItems.value = dailyData.items || [];
    monthlyItems.value = monthlyData.items || [];
    loading.value = false;

    await nextTick();
    if (seq !== requestSeq || destroyed) return;
    renderCharts();
  } catch (err) {
    if (seq !== requestSeq || destroyed) return;
    summary.value = null;
    categoryItems.value = [];
    dailyItems.value = [];
    monthlyItems.value = [];
    errorMsg.value = err.message;
    loading.value = false;
  }
}

function buildPieOption() {
  const items = categoryItems.value;
  const amountMap = new Map(items.map((item) => [item.name, item]));

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params) =>
        `${params.marker}${params.name}<br/>支出 ¥${formatMoney(params.value)}（${params.percent}%）`,
    },
    legend: {
      type: 'scroll',
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 12, color: '#4b5563' },
      formatter: (name) => {
        const item = amountMap.get(name);
        return item ? `${name} ¥${formatMoney(item.amount)}` : name;
      },
    },
    series: [
      {
        name: '类目支出',
        type: 'pie',
        radius: ['45%', '68%'],
        center: ['50%', '43%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 4 },
        label: { formatter: '{d}%', fontSize: 11, color: '#4b5563' },
        labelLine: { length: 8, length2: 8 },
        data: items.map((item) => ({
          name: item.name,
          value: item.amount,
          itemStyle: { color: item.color },
        })),
      },
    ],
  };
}

function buildDailyOption() {
  const items = dailyItems.value;

  return {
    grid: { left: 12, right: 16, top: 24, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const point = Array.isArray(params) ? params[0] : params;
        const item = items[point.dataIndex];
        if (!item) return '';
        return `${item.date}<br/>支出 <strong>¥${formatMoney(item.amount)}</strong>`;
      },
    },
    xAxis: {
      type: 'category',
      data: items.map((item) => String(Number(item.date.slice(8)))),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e5e8ef' } },
      axisLabel: { interval: 0, fontSize: 9, color: '#6b7280' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f0f2f7' } },
      axisLabel: { formatter: (value) => `¥${value}`, fontSize: 11, color: '#6b7280' },
    },
    series: [
      {
        name: '当日支出',
        type: 'bar',
        barMaxWidth: 14,
        itemStyle: { color: '#2f6bff', borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { color: '#1d4ed8' } },
        data: items.map((item) => item.amount),
      },
    ],
  };
}

function buildMonthlyOption() {
  const items = monthlyItems.value;

  return {
    grid: { left: 12, right: 16, top: 24, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const point = Array.isArray(params) ? params[0] : params;
        const item = items[point.dataIndex];
        if (!item) return '';
        return `${item.month}<br/>支出 <strong>¥${formatMoney(item.total)}</strong>`;
      },
    },
    xAxis: {
      type: 'category',
      data: items.map((item) => item.month),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e5e8ef' } },
      axisLabel: { fontSize: 11, color: '#6b7280' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f0f2f7' } },
      axisLabel: { formatter: (value) => `¥${value}`, fontSize: 11, color: '#6b7280' },
    },
    series: [
      {
        name: '月度支出',
        type: 'bar',
        barMaxWidth: 36,
        itemStyle: { color: '#5b8cff', borderRadius: [6, 6, 0, 0] },
        emphasis: { itemStyle: { color: '#2f6bff' } },
        data: items.map((item) => item.total),
      },
    ],
  };
}

function renderCharts() {
  if (hasData.value && categoryItems.value.length && pieEl.value) {
    if (!pieChart) pieChart = echarts.init(pieEl.value);
    pieChart.setOption(buildPieOption(), true);
    pieChart.resize();
  } else {
    if (pieChart) pieChart.dispose();
    pieChart = null;
  }

  if (hasData.value && dailyEl.value) {
    if (!dailyChart) dailyChart = echarts.init(dailyEl.value);
    dailyChart.setOption(buildDailyOption(), true);
    dailyChart.resize();
  } else {
    if (dailyChart) dailyChart.dispose();
    dailyChart = null;
  }

  if (hasMonthlyData.value && monthlyEl.value) {
    if (!monthlyChart) monthlyChart = echarts.init(monthlyEl.value);
    monthlyChart.setOption(buildMonthlyOption(), true);
    monthlyChart.resize();
  } else {
    if (monthlyChart) monthlyChart.dispose();
    monthlyChart = null;
  }
}

function handleResize() {
  if (pieChart) pieChart.resize();
  if (dailyChart) dailyChart.resize();
  if (monthlyChart) monthlyChart.resize();
}

function disposeAllCharts() {
  if (pieChart) pieChart.dispose();
  if (dailyChart) dailyChart.dispose();
  if (monthlyChart) monthlyChart.dispose();
  pieChart = null;
  dailyChart = null;
  monthlyChart = null;
}

function changeMonth(delta) {
  month.value = shiftMonth(month.value, delta);
  loadData();
}

onMounted(() => {
  loadData();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  destroyed = true;
  window.removeEventListener('resize', handleResize);
  disposeAllCharts();
});
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div class="page-heading">
        <h1 class="page-title">统计分析</h1>
        <p class="page-subtitle">看清支出结构与每日、月度变化</p>
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

    <div v-if="loading" class="state-card">加载中…</div>

    <div v-else-if="errorMsg" class="state-card error-card">
      <div class="error-title">统计数据加载失败</div>
      <p class="error-detail">{{ errorMsg }}</p>
      <button type="button" class="btn btn-primary" @click="loadData">重试</button>
    </div>

    <template v-else>
      <div class="metric-grid">
        <div class="metric-card">
          <span class="metric-label">本月总支出</span>
          <strong class="metric-value">¥{{ formatMoney(summary?.total ?? 0) }}</strong>
          <span class="metric-sub">{{ monthLabel }}</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">记账笔数</span>
          <strong class="metric-value">
            {{ summary?.count ?? 0 }}<span class="unit">笔</span>
          </strong>
          <span class="metric-sub">本月累计记录</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">日均支出</span>
          <strong class="metric-value">¥{{ formatMoney(summary?.dailyAvg ?? 0) }}</strong>
          <span class="metric-sub">按已过天数计算</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">环比上月</span>
          <strong class="metric-value" :class="changeClass">{{ changeText }}</strong>
          <span class="metric-sub">上月 ¥{{ formatMoney(summary?.prevTotal ?? 0) }}</span>
        </div>
      </div>

      <div class="chart-grid">
        <section class="card chart-card">
          <div class="card-head">
            <div>
              <h2 class="card-title">类目占比</h2>
              <p class="card-subtitle">{{ monthLabel }} 支出结构</p>
            </div>
            <span v-if="categoryItems.length" class="muted">
              {{ categoryItems.length }} 个类目
            </span>
          </div>
          <div class="chart-body">
            <div v-if="!categoryItems.length" class="chart-empty">本月暂无数据</div>
            <div v-else ref="pieEl" class="chart"></div>
          </div>
        </section>

        <section class="card chart-card">
          <div class="card-head">
            <div>
              <h2 class="card-title">每日趋势</h2>
              <p class="card-subtitle">{{ monthLabel }} 每日支出</p>
            </div>
            <span v-if="hasData" class="muted">共 {{ summary?.count ?? 0 }} 笔</span>
          </div>
          <div class="chart-body">
            <div v-if="!hasData" class="chart-empty">本月暂无数据</div>
            <div v-else ref="dailyEl" class="chart"></div>
          </div>
        </section>

        <section class="card chart-card chart-wide">
          <div class="card-head">
            <div>
              <h2 class="card-title">近 6 个月趋势</h2>
              <p class="card-subtitle">截至 {{ monthLabel }} 的月度支出对比</p>
            </div>
          </div>
          <div class="chart-body">
            <div v-if="!hasMonthlyData" class="chart-empty">本月暂无数据</div>
            <div v-else ref="monthlyEl" class="chart"></div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.unit {
  margin-left: 2px;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 500;
}
</style>
