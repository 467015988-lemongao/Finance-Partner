<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
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
const chartType = ref('expense');
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
const typeLabel = computed(() => (chartType.value === 'income' ? '收入' : '支出'));
const chartCount = computed(() =>
  Number(
    chartType.value === 'income'
      ? summary.value?.incomeCount ?? 0
      : summary.value?.expenseCount ?? 0,
  ),
);
const hasChartData = computed(() => chartCount.value > 0);
const hasMonthlyData = computed(() =>
  monthlyItems.value.some(
    (item) => Number(item.expense) > 0 || Number(item.income) > 0,
  ),
);
const balanceValue = computed(() => Number(summary.value?.balance ?? 0));
const balanceText = computed(() => {
  const value = balanceValue.value;
  return value < 0 ? `-¥${formatMoney(Math.abs(value))}` : `¥${formatMoney(value)}`;
});
const balanceClass = computed(() => (balanceValue.value < 0 ? 'is-negative' : 'is-positive'));

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
      apiGet(`/stats/by-category?month=${month.value}&type=${chartType.value}`),
      apiGet(`/stats/daily?month=${month.value}&type=${chartType.value}`),
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
        `${params.marker}${params.name}<br/>${typeLabel.value} ¥${formatMoney(params.value)}（${params.percent}%）`,
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
        name: `类目${typeLabel.value}`,
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
        return `${item.date}<br/>${typeLabel.value} <strong>¥${formatMoney(item.amount)}</strong>`;
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
        name: `当日${typeLabel.value}`,
        type: 'bar',
        barMaxWidth: 14,
        itemStyle: {
          color: chartType.value === 'income' ? '#17a673' : '#e5484d',
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: {
          itemStyle: { color: chartType.value === 'income' ? '#0f8a5f' : '#c93b3f' },
        },
        data: items.map((item) => item.amount),
      },
    ],
  };
}

function buildMonthlyOption() {
  const items = monthlyItems.value;

  return {
    grid: { left: 12, right: 16, top: 40, bottom: 8, containLabel: true },
    legend: {
      top: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 12, color: '#4b5563' },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const point = Array.isArray(params) ? params[0] : params;
        const item = items[point.dataIndex];
        if (!item) return '';
        return `${item.month}<br/>支出 <strong>¥${formatMoney(item.expense)}</strong><br/>收入 <strong>¥${formatMoney(item.income)}</strong>`;
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
        name: '支出',
        type: 'bar',
        barMaxWidth: 18,
        itemStyle: { color: '#e5484d', borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { color: '#c93b3f' } },
        data: items.map((item) => item.expense),
      },
      {
        name: '收入',
        type: 'bar',
        barMaxWidth: 18,
        itemStyle: { color: '#17a673', borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { color: '#0f8a5f' } },
        data: items.map((item) => item.income),
      },
    ],
  };
}

function renderCharts() {
  if (hasChartData.value && categoryItems.value.length && pieEl.value) {
    if (!pieChart) pieChart = echarts.init(pieEl.value);
    pieChart.setOption(buildPieOption(), true);
    pieChart.resize();
  } else {
    if (pieChart) pieChart.dispose();
    pieChart = null;
  }

  if (hasChartData.value && dailyEl.value) {
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

watch(chartType, () => loadData());

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
        <p class="page-subtitle">看清收支结构与每日、月度变化</p>
      </div>
      <div class="header-controls">
        <div class="segmented chart-type-switch">
          <button
            type="button"
            class="segmented-btn"
            :class="{ active: chartType === 'expense' }"
            @click="chartType = 'expense'"
          >
            支出
          </button>
          <button
            type="button"
            class="segmented-btn is-income"
            :class="{ active: chartType === 'income' }"
            @click="chartType = 'income'"
          >
            收入
          </button>
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
          <span class="metric-label">本月支出</span>
          <strong class="metric-value is-expense">
            ¥{{ formatMoney(summary?.expenseTotal ?? 0) }}
          </strong>
          <span class="metric-sub">{{ monthLabel }}</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">本月收入</span>
          <strong class="metric-value is-positive">
            ¥{{ formatMoney(summary?.incomeTotal ?? 0) }}
          </strong>
          <span class="metric-sub">{{ summary?.incomeCount ?? 0 }} 笔收入</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">结余</span>
          <strong class="metric-value" :class="balanceClass">{{ balanceText }}</strong>
          <span class="metric-sub">收入 - 支出</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">记账笔数</span>
          <strong class="metric-value is-count">
            {{ summary?.expenseCount ?? 0 }}<span class="unit">笔支出</span>
            ·
            {{ summary?.incomeCount ?? 0 }}<span class="unit">笔收入</span>
          </strong>
          <span class="metric-sub">本月累计记录</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">日均支出</span>
          <strong class="metric-value">¥{{ formatMoney(summary?.dailyAvg ?? 0) }}</strong>
          <span class="metric-sub">按已过天数计算</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">环比支出</span>
          <strong class="metric-value" :class="changeClass">{{ changeText }}</strong>
          <span class="metric-sub">上月支出 ¥{{ formatMoney(summary?.prevTotal ?? 0) }}</span>
        </div>
      </div>

      <div class="chart-grid">
        <section class="card chart-card">
          <div class="card-head">
            <div>
              <h2 class="card-title">类目占比</h2>
              <p class="card-subtitle">{{ monthLabel }} {{ typeLabel }}结构</p>
            </div>
            <span v-if="categoryItems.length" class="muted">
              {{ categoryItems.length }} 个类目
            </span>
          </div>
          <div class="chart-body">
            <div v-if="!categoryItems.length" class="chart-empty">
              本月暂无{{ typeLabel }}数据
            </div>
            <div v-else ref="pieEl" class="chart"></div>
          </div>
        </section>

        <section class="card chart-card">
          <div class="card-head">
            <div>
              <h2 class="card-title">每日趋势</h2>
              <p class="card-subtitle">{{ monthLabel }} 每日{{ typeLabel }}</p>
            </div>
            <span v-if="hasChartData" class="muted">共 {{ chartCount }} 笔</span>
          </div>
          <div class="chart-body">
            <div v-if="!hasChartData" class="chart-empty">
              本月暂无{{ typeLabel }}数据
            </div>
            <div v-else ref="dailyEl" class="chart"></div>
          </div>
        </section>

        <section class="card chart-card chart-wide">
          <div class="card-head">
            <div>
              <h2 class="card-title">近 6 个月趋势</h2>
              <p class="card-subtitle">截至 {{ monthLabel }} 的月度收支对比</p>
            </div>
          </div>
          <div class="chart-body">
            <div v-if="!hasMonthlyData" class="chart-empty">近 6 个月暂无数据</div>
            <div v-else ref="monthlyEl" class="chart"></div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.chart-type-switch {
  box-shadow: var(--shadow);
}

.metric-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.metric-value.is-expense,
.metric-value.is-negative {
  color: var(--danger);
}

.metric-value.is-positive {
  color: var(--success);
}

.metric-value.is-count {
  font-size: 18px;
}

.unit {
  margin-left: 2px;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 500;
}

@media (max-width: 1100px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .metric-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
