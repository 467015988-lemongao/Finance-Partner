<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import { GridComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { api } from '../api'
import MonthSwitcher from '../components/MonthSwitcher.vue'
import { currentMonthKey, formatMoney, shiftMonthKey } from '../utils/format'

echarts.use([PieChart, BarChart, TitleComponent, TooltipComponent, GridComponent, CanvasRenderer])

const monthKey = ref(currentMonthKey())
const summary = ref(null)
const byCategory = ref({ total: 0, items: [] })
const daily = ref([])
const loading = ref(true)
const error = ref('')

const pieEl = ref(null)
const barEl = ref(null)
let pieChart = null
let barChart = null
let darkQuery = null
let loadToken = 0

const isDarkMode = ref(false)

const hasData = computed(
  () => Boolean(summary.value && summary.value.count > 0 && byCategory.value.items.length),
)

const metrics = computed(() => {
  const data = summary.value
  if (!data) return []
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
    { label: '笔数', value: String(data.count), tone: '' },
    { label: '日均', value: `¥${formatMoney(data.dailyAvg)}`, tone: '' },
    { label: '环比', value: changeText, tone },
  ]
})

function chartColors() {
  return isDarkMode.value
    ? { text: '#e8eaed', muted: '#9aa0aa', line: '#2a2e37', tooltip: '#2a2e37' }
    : { text: '#1f2328', muted: '#8a9099', line: '#e6e8ec', tooltip: '#ffffff' }
}

function buildPieOption() {
  const colors = chartColors()
  return {
    backgroundColor: 'transparent',
    title: {
      text: `¥${formatMoney(byCategory.value.total)}`,
      subtext: '本月支出',
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
        return `${month}月${point.axisValue}日<br/>支出 ¥${formatMoney(point.value)}`
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
        itemStyle: { color: '#2f6bff', borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { color: '#1f57d8' } },
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
}

function renderCharts() {
  if (!hasData.value) {
    disposeCharts()
    return
  }
  if (!pieEl.value || !barEl.value) return

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
}

function onResize() {
  if (pieChart) pieChart.resize()
  if (barChart) barChart.resize()
}

async function load() {
  const token = ++loadToken
  loading.value = true
  error.value = ''
  try {
    const [summaryData, categoryData, dailyData] = await Promise.all([
      api.getSummary(monthKey.value),
      api.getByCategory(monthKey.value),
      api.getDaily(monthKey.value),
    ])
    if (token !== loadToken) return
    summary.value = summaryData
    byCategory.value = categoryData
    daily.value = dailyData.items || []
  } catch (err) {
    if (token !== loadToken) return
    summary.value = null
    byCategory.value = { total: 0, items: [] }
    daily.value = []
    error.value = err.message
  } finally {
    if (token === loadToken) loading.value = false
  }
  if (token !== loadToken) return
  await nextTick()
  if (hasData.value) renderCharts()
  else disposeCharts()
}

function shiftMonth(delta) {
  monthKey.value = shiftMonthKey(monthKey.value, delta)
}

function onThemeChange() {
  if (darkQuery) isDarkMode.value = darkQuery.matches
  nextTick(() => renderCharts())
}

watch(monthKey, load)

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
        <p class="page-sub">看看钱都花在哪儿了</p>
      </div>
    </header>

    <MonthSwitcher :month="monthKey" @shift="shiftMonth" />

    <div v-if="loading" class="stats-skeleton">
      <div class="metric-scroll">
        <div v-for="n in 4" :key="n" class="skeleton metric-skeleton"></div>
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
        <div v-for="metric in metrics" :key="metric.label" class="metric-card">
          <div class="metric-label">{{ metric.label }}</div>
          <div class="metric-value" :class="metric.tone">{{ metric.value }}</div>
        </div>
      </div>

      <section class="card chart-card">
        <h2 class="section-title">类目占比</h2>
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
      </section>

      <section class="card chart-card">
        <h2 class="section-title">每日趋势</h2>
        <div ref="barEl" class="chart bar-chart"></div>
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
