<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { getMonthlyTrend, getCourseBreakdown, getTypeComparison, getMonthSummary } from '../composables/useDashboardStats';

const props = defineProps({
  records: { type: Array, default: () => [] },
});

const emit = defineEmits(['back']);

const availableYears = computed(() => {
  const set = new Set();
  const list = Array.isArray(props.records) ? props.records : [];
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (!r) continue;
    const ld = r.lessonDate && typeof r.lessonDate === 'string' ? r.lessonDate.trim() : '';
    const m = /^(\d{4})/.exec(ld);
    if (m) set.add(m[1]);
  }
  const years = Array.from(set).sort();
  if (!years.length) years.push(String(new Date().getFullYear()));
  return years;
});

const selectedYear = ref(availableYears.value[availableYears.value.length - 1] || String(new Date().getFullYear()));

const trendData = computed(() => getMonthlyTrend(props.records, selectedYear.value));
const breakdownData = computed(() => getCourseBreakdown(props.records, selectedYear.value));
const typeData = computed(() => getTypeComparison(props.records, selectedYear.value));
const currentMonthSummary = computed(() => {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return getMonthSummary(props.records, ym);
});

/* ────────── Chart.js refs ────────── */
let Chart = null;
const chartError = ref(false);
const chartReady = ref(false);
let trendChartInst = null;
let pieChartInst = null;
let typeChartInst = null;
const trendCanvas = ref(null);
const pieCanvas = ref(null);
const typeCanvas = ref(null);

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#64748b',
];

function destroyCharts() {
  if (trendChartInst) { trendChartInst.destroy(); trendChartInst = null; }
  if (pieChartInst) { pieChartInst.destroy(); pieChartInst = null; }
  if (typeChartInst) { typeChartInst.destroy(); typeChartInst = null; }
}

function renderAllCharts() {
  if (!Chart) return;
  destroyCharts();
  renderTrendChart();
  renderPieChart();
  renderTypeChart();
}

async function initCharts() {
  try {
    const mod = await import('chart.js');
    Chart = mod.Chart;
    Chart.register(
      mod.BarController,
      mod.LineController,
      mod.DoughnutController,
      mod.PieController,
      mod.CategoryScale,
      mod.LinearScale,
      mod.BarElement,
      mod.PointElement,
      mod.LineElement,
      mod.ArcElement,
      mod.Tooltip,
      mod.Legend,
      mod.Filler,
    );
    await nextTick();
    renderAllCharts();
    chartReady.value = true;
  } catch (e) {
    chartError.value = true;
    chartReady.value = false;
    console.error('DataDashboard chart import failed:', e && e.message);
  }
}

watch(selectedYear, () => {
  if (chartReady.value) {
    nextTick(() => renderAllCharts());
  }
});

function renderTrendChart() {
  if (!trendCanvas.value || !Chart) return;
  if (trendChartInst) { trendChartInst.destroy(); trendChartInst = null; }

  const data = trendData.value;

  trendChartInst = new Chart(trendCanvas.value, {
    type: 'bar',
    data: {
      labels: data.map(d => d.label),
      datasets: [
        {
          label: '课时',
          data: data.map(d => d.hours),
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderColor: '#6366f1',
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'y',
          order: 2,
        },
        {
          label: '费用 (¥)',
          data: data.map(d => d.fee),
          type: 'line',
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.15)',
          pointBackgroundColor: '#f43f5e',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.3,
          fill: true,
          yAxisID: 'y1',
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}${ctx.dataset.label.includes('费用') ? '' : ''}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: '课时', font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
        y1: {
          beginAtZero: true,
          position: 'right',
          title: { display: true, text: '费用 (¥)', font: { size: 11 } },
          grid: { display: false },
        },
      },
    },
  });
}

function renderPieChart() {
  if (!pieCanvas.value || !Chart) return;
  if (pieChartInst) { pieChartInst.destroy(); pieChartInst = null; }

  const data = breakdownData.value;

  pieChartInst = new Chart(pieCanvas.value, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.course),
      datasets: [{
        data: data.map(d => d.fee),
        backgroundColor: data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: {
          position: 'right',
          labels: { boxWidth: 10, padding: 8, font: { size: 10 } },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const item = data[ctx.dataIndex];
              return `${item.course}: ¥${item.fee} (${item.feePercent}%)`;
            },
          },
        },
      },
    },
  });
}

function renderTypeChart() {
  if (!typeCanvas.value || !Chart) return;
  if (typeChartInst) { typeChartInst.destroy(); typeChartInst = null; }

  const data = typeData.value;

  typeChartInst = new Chart(typeCanvas.value, {
    type: 'bar',
    data: {
      labels: ['常规课', '零售课'],
      datasets: [
        {
          label: '课时',
          data: [data.regular.hours, data.retail.hours],
          backgroundColor: ['rgba(99, 102, 241, 0.7)', 'rgba(245, 158, 11, 0.7)'],
          borderRadius: 4,
        },
        {
          label: '费用 (¥)',
          data: [data.regular.fee, data.retail.fee],
          backgroundColor: ['rgba(99, 102, 241, 0.3)', 'rgba(245, 158, 11, 0.3)'],
          borderRadius: 4,
        },
        {
          label: '节数',
          data: [data.regular.count, data.retail.count],
          backgroundColor: ['rgba(99, 102, 241, 0.1)', 'rgba(245, 158, 11, 0.1)'],
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } },
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
      },
    },
  });
}

onMounted(async () => {
  await initCharts();
});

onBeforeUnmount(() => {
  destroyCharts();
});
</script>

<template>
  <section class="space-y-4">
    <header class="flex items-center justify-between gap-2">
      <button
        type="button"
        class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 active:bg-slate-50"
        @click="emit('back')"
      >
        ‹ 日历
      </button>
      <h1 class="text-lg font-semibold text-slate-900">数据看板</h1>
      <select
        class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
        v-model="selectedYear"
      >
        <option v-for="y in availableYears" :key="y" :value="y">{{ y }}年</option>
      </select>
    </header>

    <!-- 本月汇总卡片 -->
    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p class="text-xs font-medium text-slate-500 mb-2">本月汇总</p>
      <div class="flex items-end gap-4">
        <div>
          <p class="text-2xl font-bold text-indigo-700">{{ currentMonthSummary.totalHours }}</p>
          <p class="text-xs text-slate-500">课时</p>
        </div>
        <div>
          <p class="text-2xl font-bold text-emerald-700">¥{{ currentMonthSummary.totalFee }}</p>
          <p class="text-xs text-slate-500">费用</p>
        </div>
        <div>
          <p class="text-2xl font-bold text-slate-700">{{ currentMonthSummary.count }}</p>
          <p class="text-xs text-slate-500">课次</p>
        </div>
        <div>
          <p class="text-2xl font-bold text-amber-600">{{ currentMonthSummary.daysWithLessons }}</p>
          <p class="text-xs text-slate-500">上课天数</p>
        </div>
      </div>
      <div class="mt-2 flex gap-3 text-xs text-slate-500">
        <span>常规课: {{ currentMonthSummary.regularHours }}h / ¥{{ currentMonthSummary.regularFee }}</span>
        <span>零售课: {{ currentMonthSummary.retailHours }}h / ¥{{ currentMonthSummary.retailFee }}</span>
      </div>
    </div>

    <!-- 月度趋势 -->
    <div v-if="chartError" class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800">
      图表组件未安装，请在终端运行 <code class="bg-amber-100 px-1 rounded">npm install chart.js</code>
    </div>
    <div v-else class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p class="text-xs font-medium text-slate-500 mb-2">月度趋势（课时 + 费用）</p>
      <div class="h-56">
        <canvas ref="trendCanvas" />
      </div>
    </div>

    <!-- 课程分布 + 类型对比 -->
    <template v-if="!chartError">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-slate-500 mb-2">课程费用分布</p>
          <div class="h-48">
            <canvas ref="pieCanvas" />
          </div>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs font-medium text-slate-500 mb-2">常规课 vs 零售课</p>
          <div class="h-48">
            <canvas ref="typeCanvas" />
          </div>
        </div>
      </div>
    </template>

    <!-- 课程排名表格 -->
    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p class="text-xs font-medium text-slate-500 mb-2">课程费用排名</p>
      <table class="w-full text-xs">
        <thead>
          <tr class="text-slate-500 border-b border-slate-100">
            <th class="py-1.5 text-left font-medium">课程</th>
            <th class="py-1.5 text-right font-medium">课时</th>
            <th class="py-1.5 text-right font-medium">费用</th>
            <th class="py-1.5 text-right font-medium">占比</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in breakdownData" :key="item.course" class="border-b border-slate-50">
            <td class="py-1.5 text-slate-900 truncate max-w-[120px]">{{ item.course }}</td>
            <td class="py-1.5 text-right text-slate-700">{{ item.hours }}</td>
            <td class="py-1.5 text-right text-emerald-700 font-medium">¥{{ item.fee }}</td>
            <td class="py-1.5 text-right text-slate-500">{{ item.feePercent }}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
