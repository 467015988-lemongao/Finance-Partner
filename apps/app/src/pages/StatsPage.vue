<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { api } from '../api'
import MonthSwitcher from '../components/MonthSwitcher.vue'
import { currentMonthKey, formatMoney, shiftMonthKey } from '../utils/format'

echarts.use([
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  CanvasRenderer,
])

const monthKey = ref(currentMonthKey())
const chartType = ref('expense')
const summary = ref(null)
const byCategory = ref({ total: 0, items: [] })
const daily = ref([])
const monthly = ref([])
const loading = ref(true)
const error = ref('')

const pieEl = ref(null)
const barEl = ref(null)
const monthlyEl = ref(null)
let pieChart = null
let barChart = null
let monthlyChart = null
let darkQuery = null
let loadToken = 0

const isDarkMode = ref(false)

const typeLabel = computed(() => (chartType.value === 'income' ? '收入' : '支出'))

const hasData = computed(() => {
  const data = summary.value
  if (!data) return false
  const expenseCount = Number(data.expenseCount ?? data.count ?? 0)
  const incomeCount = Number(data.incomeCount ?? 0)
  return expenseCount + incomeCount > 0
})

const chartHasData = computed(() => byCategory.value.items.length > 0)

const metrics = computed(() => {
  const data = summary.value
  if (!data) return []
  const expenseCount = Number(data.expenseCount ?? data.count ?? 0)
  const incomeCount = Number(data.incomeCount ?? 0)
  const balance = Number(
    data.balance ?? Number(data.incomeTotal || 0) - Number(data.total || 0),
  )

  const change = data.changePercent
  let changeText = '—'
  let tone = ''
  if (change !== null && change !== undefined) {
    const value = Number(change)
    changeText = `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
    tone = value > 0 ? 'up' : value < 0 ? 'down' : ''
  }

  return [
    { label: '本月支出', value: `¥${formatMoney(data.total)}`, tone: '' },
    { label: '本月收入', value: `¥${formatMoney(data.incomeTotal)}`, tone: 'income' },
    {
      label: '结余',
      value: `${balance < 0 ? '-' : ''}¥${formatMoney(Math.abs(balance))}`,
      tone: balance < 0 ? 'loss' : balance > 0 ? 'income' : '',
    },
    {
      label: '笔数',
      value: `${expenseCount} 笔支出 · ${incomeCount} 笔收入`,
      tone: '',
      wide: true,
      small: true,
    },
    { label: '日均', value: `¥${formatMoney(data.dailyAvg)}`, tone: '' },
    { label: '环比', value: changeText, tone },
  ]
})

function chartColors() {
  return isDarkMode.value
    ? { text: '#e8eaed', muted: '#9aa0aa', line: '#2a2e37', tooltip: '#2a2e37' }
    : { text: '#1f2328', muted: '#8a9099', line: '#e6e8ec', tooltip: '#ffffff' }
}

function incomeColor() {
  return isDarkMode.value ? '#73d13d' : '#52c41a'
}

function buildPieOption() {
  const colors = chartColors()
  return {
    backgroundColor: 'transparent',
    title: {
      text: `¥${formatMoney(byCategory.value.total)}`,
      subtext: `本月${typeLabel.value}`,
      left: 'center',
      top: 'center',
      itemGap: 4,
      textStyle: { fontSize: 20, fontWeight: 700, color: colors.text },
      subtextStyle: { fontSize: 12, color: colors.muted },
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: colors.tooltip,
      borderWidth: 0,
      textStyle: { color: colors.text },
      formatter: (params) =>
        `${params.marker}${params.name}<br/>¥${formatMoney(params.value)}（${params.percent}%）`,
    },
    series: [
      {
        type: 'pie',
        radius: ['58%', '78%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: {
          borderColor: isDarkMode.value ? '#1c1f26' : '#ffffff',
          borderWidth: 2,
        },
        data: byCategory.value.items.map((item) => ({
          name: item.name,
          value: item.amount,
          itemStyle: { color: item.color || '#8c8c8c' },
        })),
      },
    ],
  }
}

function buildBarOption() {
  const colors = chartColors()
  const items = daily.value
  const lastIndex = items.length - 1
  const color = chartType.value === 'income' ? incomeColor() : '#2f6bff'
  const emphasisColor = chartType.value === 'income' ? color : '#1f57d8'
  return {
    backgroundColor: 'transparent',
    grid: { left: 4, right: 8, top: 24, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: colors.tooltip,
      borderWidth: 0,
      textStyle: { color: colors.text },
      formatter: (params) => {
        const point = params[0]
        if (!point) return ''
        const month = Number(monthKey.value.slice(5))
        return `${month}月${point.axisValue}日<br/>${typeLabel.value} ¥${formatMoney(point.value)}`
      },
    },
    xAxis: {
      type: 'category',
      data: items.map((item) => String(Number(item.date.slice(8)))),
      axisLine: { lineStyle: { color: colors.line } },
      axisTick: { show: false },
      axisLabel: {
        color: colors.muted,
        fontSize: 10,
        interval: (index) => {
          const day = index + 1
          return day === 1 || index === lastIndex || day % 5 === 0
        },
      },
    },
    yAxis: {
      type: 'value',
      splitNumber: 3,
      axisLabel: {
        color: colors.muted,
        fontSize: 10,
        formatter: (value) => (value >= 1000 ? `${Math.round(value / 100) / 10}k` : value),
      },
      splitLine: { lineStyle: { color: colors.line, type: 'dashed' } },
      axisLine: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: items.map((item) => item.amount),
        barMaxWidth: 10,
        itemStyle: { color, borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { color: emphasisColor } },
      },
    ],
  }
}

function buildMonthlyOption() {
  const colors = chartColors()
  const income = incomeColor()
  return {
    backgroundColor: 'transparent',
    grid: { left: 4, right: 8, top: 36, bottom: 4, containLabel: true },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 12,
      data: ['支出', '收入'],
      textStyle: { color: colors.muted, fontSize: 11 },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: colors.tooltip,
      borderWidth: 0,
      textStyle: { color: colors.text },
      formatter: (params) => {
        if (!params || !params.length) return ''
        const lines = params.map(
          (point) => `${point.marker}${point.seriesName} ¥${formatMoney(point.value)}`,
        )
        return `${params[0].axisValue}<br/>${lines.join('<br/>')}`
      },
    },
    xAxis: {
      type: 'category',
      data: monthly.value.map((item) => `${Number(item.month.slice(5))}月`),
      axisLine: { lineStyle: { color: colors.line } },
      axisTick: { show: false },
      axisLabel: { color: colors.muted, fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      splitNumber: 3,
      axisLabel: {
        color: colors.muted,
        fontSize: 10,
        formatter: (value) => (value >= 1000 ? `${Math.round(value / 100) / 10}k` : value),
      },
      splitLine: { lineStyle: { color: colors.line, type: 'dashed' } },
      axisLine: { show: false },
    },
    series: [
      {
        name: '支出',
        type: 'bar',
        data: monthly.value.map((item) => item.expense),
        barMaxWidth: 10,
        itemStyle: { color: '#2f6bff', borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { color: '#1f57d8' } },
      },
      {
        name: '收入',
        type: 'bar',
        data: monthly.value.map((item) => item.income),
        barMaxWidth: 10,
        itemStyle: { color: income, borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { color: income } },
      },
    ],
  }
}

function disposeCharts() {
  if (pieChart) {
    pieChart.dispose()
    pieChart = null
  }
  if (barChart) {
    barChart.dispose()
    barChart = null
  }
  if (monthlyChart) {
    monthlyChart.dispose()
    monthlyChart = null
  }
}

function renderCharts() {
  if (!hasData.value) {
    disposeCharts()
    return
  }

  if (chartHasData.value && pieEl.value && barEl.value) {
    if (!pieChart || pieChart.getDom() !== pieEl.value) {
      if (pieChart) pieChart.dispose()
      pieChart = echarts.init(pieEl.value)
    }
    if (!barChart || barChart.getDom() !== barEl.value) {
      if (barChart) barChart.dispose()
      barChart = echarts.init(barEl.value)
    }
    pieChart.setOption(buildPieOption(), true)
    barChart.setOption(buildBarOption(), true)
  } else {
    if (pieChart) {
      pieChart.dispose()
      pieChart = null
    }
    if (barChart) {
      barChart.dispose()
      barChart = null
    }
  }

  if (monthly.value.length && monthlyEl.value) {
    if (!monthlyChart || monthlyChart.getDom() !== monthlyEl.value) {
      if (monthlyChart) monthlyChart.dispose()
      monthlyChart = echarts.init(monthlyEl.value)
    }
    monthlyChart.setOption(buildMonthlyOption(), true)
  } else if (monthlyChart) {
    monthlyChart.dispose()
    monthlyChart = null
  }
}

function onResize() {
  if (pieChart) pieChart.resize()
  if (barChart) barChart.resize()
  if (monthlyChart) monthlyChart.resize()
}

async function load() {
  const token = ++loadToken
  loading.value = true
  error.value = ''
  try {
    const [summaryData, categoryData, dailyData, monthlyData] = await Promise.all([
      api.getSummary(monthKey.value),
      api.getByCategory(monthKey.value, chartType.value),
      api.getDaily(monthKey.value, chartType.value),
      api.getMonthly(monthKey.value, 6),
    ])
    if (token !== loadToken) return
    summary.value = summaryData
    byCategory.value = categoryData
    daily.value = dailyData.items || []
    monthly.value = monthlyData.items || []
  } catch (err) {
    if (token !== loadToken) return
    summary.value = null
    byCategory.value = { total: 0, items: [] }
    daily.value = []
    monthly.value = []
    error.value = err.message
  } finally {
    if (token === loadToken) loading.value = false
  }
  if (token !== loadToken) return
  await nextTick()
  renderCharts()
}

async function reloadCharts() {
  const token = ++loadToken
  try {
    const [categoryData, dailyData] = await Promise.all([
      api.getByCategory(monthKey.value, chartType.value),
      api.getDaily(monthKey.value, chartType.value),
    ])
    if (token !== loadToken) return
    byCategory.value = categoryData
    daily.value = dailyData.items || []
  } catch (err) {
    if (token !== loadToken) return
    byCategory.value = { total: 0, items: [] }
    daily.value = []
    error.value = err.message
  }
  if (token !== loadToken) return
  await nextTick()
  renderCharts()
}

function shiftMonth(delta) {
  monthKey.value = shiftMonthKey(monthKey.value, delta)
}

function onThemeChange() {
  if (darkQuery) isDarkMode.value = darkQuery.matches
  nextTick(() => renderCharts())
}

watch(monthKey, load)
watch(chartType, reloadCharts)

onMounted(() => {
  darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
  isDarkMode.value = darkQuery.matches
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', onThemeChange)
  window.addEventListener('resize', onResize)
  load()
})

onBeforeUnmount(() => {
  if (darkQuery && darkQuery.removeEventListener) {
    darkQuery.removeEventListener('change', onThemeChange)
  }
  window.removeEventListener('resize', onResize)
  disposeCharts()
})
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title">统计</h1>
        <p class="page-sub">看看钱都花在哪儿、又从哪儿来</p>
      </div>
    </header>

    <MonthSwitcher :month="monthKey" @shift="shiftMonth" />

    <div class="segmented" role="group" aria-label="统计类型">
      <button
        type="button"
        :class="{ active: chartType === 'expense' }"
        :aria-pressed="chartType === 'expense'"
        :disabled="loading"
        @click="chartType = 'expense'"
      >
        支出
      </button>
      <button
        type="button"
        class="income"
        :class="{ active: chartType === 'income' }"
        :aria-pressed="chartType === 'income'"
        :disabled="loading"
        @click="chartType = 'income'"
      >
        收入
      </button>
    </div>

    <div v-if="loading" class="stats-skeleton">
      <div class="metric-scroll">
        <div v-for="n in 6" :key="n" class="skeleton metric-skeleton"></div>
      </div>
      <div class="skeleton chart-skeleton"></div>
      <div class="skeleton chart-skeleton bar"></div>
    </div>

    <div v-else-if="error" class="state-block">
      <span class="state-emoji">😵</span>
      <p class="state-title">统计加载失败</p>
      <p class="state-desc">{{ error }}</p>
      <button type="button" class="state-action" @click="load">重试</button>
    </div>

    <div v-else-if="!hasData" class="state-block">
      <span class="state-emoji">📊</span>
      <p class="state-title">本月暂无数据</p>
      <p class="state-desc">先去记一笔，再回来看看统计吧</p>
    </div>

    <template v-else>
      <div class="metric-scroll">
        <div
          v-for="metric in metrics"
          :key="metric.label"
          class="metric-card"
          :class="{ wide: metric.wide }"
        >
          <div class="metric-label">{{ metric.label }}</div>
          <div class="metric-value" :class="[metric.tone, { small: metric.small }]">
            {{ metric.value }}
          </div>
        </div>
      </div>

      <section class="card chart-card">
        <h2 class="section-title">类目占比 · {{ typeLabel }}</h2>
        <template v-if="chartHasData">
          <div ref="pieEl" class="chart pie-chart"></div>
          <div class="legend">
            <div v-for="item in byCategory.items" :key="item.categoryId" class="legend-row">
              <span
                class="legend-dot"
                :style="{ backgroundColor: item.color || '#8c8c8c' }"
              ></span>
              <span class="legend-icon">{{ item.icon || '📦' }}</span>
              <span class="legend-name">{{ item.name }}</span>
              <span class="legend-percent">{{ Number(item.percent).toFixed(1) }}%</span>
              <span class="legend-amount">¥{{ formatMoney(item.amount) }}</span>
            </div>
          </div>
        </template>
        <div v-else class="chart-empty">本月暂无{{ typeLabel }}数据</div>
      </section>

      <section class="card chart-card">
        <h2 class="section-title">每日趋势 · {{ typeLabel }}</h2>
        <div v-if="chartHasData" ref="barEl" class="chart bar-chart"></div>
        <div v-else class="chart-empty">本月暂无{{ typeLabel }}数据</div>
      </section>

      <section class="card chart-card">
        <h2 class="section-title">近 6 个月趋势</h2>
        <div ref="monthlyEl" class="chart monthly-chart"></div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.metric-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}

.metric-scroll::-webkit-scrollbar {
  display: none;
}

.metric-card {
  flex: 0 0 106px;
  padding: 12px 10px;
  border-radius: 14px;
  background: var(--card);
  box-shadow: var(--shadow);
}

.metric-card.wide {
  flex: 0 0 178px;
}

.metric-label {
  font-size: 12px;
  color: var(--muted);
}

.metric-value {
  margin-top: 6px;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.3px;
  white-space: nowrap;
}

.metric-value.small {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
}

.metric-value.income {
  color: var(--income);
}

.metric-value.loss {
  color: var(--danger);
}

.metric-value.up {
  color: var(--danger);
}

.metric-value.down {
  color: var(--success);
}

.chart-card {
  padding-bottom: 14px;
}

.chart {
  width: 100%;
}

.pie-chart {
  height: 260px;
}

.bar-chart {
  height: 220px;
}

.monthly-chart {
  height: 240px;
}

.chart-empty {
  padding: 42px 0;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-icon {
  font-size: 15px;
  line-height: 1;
}

.legend-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend-percent {
  width: 48px;
  font-size: 12px;
  color: var(--muted);
  text-align: right;
}

.legend-amount {
  min-width: 76px;
  font-weight: 600;
  text-align: right;
}

.stats-skeleton {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metric-skeleton {
  flex: 0 0 106px;
  height: 78px;
}

.chart-skeleton {
  height: 260px;
}

.chart-skeleton.bar {
  height: 220px;
}
</style>
