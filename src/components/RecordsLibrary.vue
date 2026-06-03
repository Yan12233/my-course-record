<script setup>
const props = defineProps({
  records: {
    type: Array,
    default: () => [],
  },
  filterText: {
    type: String,
    default: '',
  },
  exportMonth: {
    type: String,
    default: '',
  },
  exportFeeYear: {
    type: String,
    default: '',
  },
  exportingZip: {
    type: Boolean,
    default: false,
  },
  exportingFeeMonth: {
    type: Boolean,
    default: false,
  },
  exportingFeeYear: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'refresh',
  'backup',
  'restore',
  'update:filterText',
  'update:exportMonth',
  'update:exportFeeYear',
  'export-month-zip',
  'export-fee-month',
  'export-fee-year',
  'open-record',
]);
</script>

<template>
  <section
    class="rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm space-y-3"
    aria-labelledby="libraryHeading"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="libraryHeading" class="text-base font-semibold text-slate-900">记录管理</h2>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 active:bg-emerald-100"
          @click="emit('backup')"
        >
          备份 JSON
        </button>
        <button
          type="button"
          class="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 active:bg-amber-100"
          @click="emit('restore')"
        >
          恢复 JSON
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 active:bg-slate-50"
          @click="emit('refresh')"
        >
          刷新
        </button>
      </div>
    </div>

    <div class="space-y-1">
      <input
        type="search"
        inputmode="search"
        placeholder="搜索课程名、时间段、上课日期、保存时间…"
        autocomplete="off"
        class="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        :value="filterText"
        @input="emit('update:filterText', $event.target.value)"
      />
      <p class="text-xs text-slate-500 px-0.5">共 {{ records.length }} 条记录</p>
    </div>

    <section class="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm space-y-3">
      <h3 class="text-base font-semibold text-slate-900">月底导出</h3>
      <p class="text-xs text-slate-500">ZIP 含全部记录汇总表（含零售课），图片按「常规课 / 零售课」分文件夹存放</p>
      <div class="flex gap-2">
        <input
          type="month"
          class="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          :value="exportMonth"
          @input="emit('update:exportMonth', $event.target.value)"
        />
        <button
          type="button"
          class="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white active:bg-indigo-700 disabled:opacity-60"
          :disabled="exportingZip"
          @click="emit('export-month-zip')"
        >
          {{ exportingZip ? '正在打包…' : '导出 ZIP' }}
        </button>
      </div>
    </section>

    <section class="rounded-2xl border border-emerald-200 bg-emerald-50/40 px-4 py-4 shadow-sm space-y-3">
      <h3 class="text-base font-semibold text-slate-900">课时费表格导出</h3>
      <p class="text-xs text-slate-500">导出 Excel，含常规课与零售课；零售课按「课时 × 人数 × 每人每课时费用」统计</p>
      <div class="space-y-2">
        <div class="flex gap-2">
          <input
            type="month"
            class="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            :value="exportMonth"
            @input="emit('update:exportMonth', $event.target.value)"
          />
          <button
            type="button"
            class="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white active:bg-emerald-700 disabled:opacity-60"
            :disabled="exportingFeeMonth"
            @click="emit('export-fee-month')"
          >
            {{ exportingFeeMonth ? '导出中…' : '月表' }}
          </button>
        </div>
        <div class="flex gap-2">
          <input
            type="number"
            inputmode="numeric"
            min="2000"
            max="2100"
            placeholder="年份"
            class="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            :value="exportFeeYear"
            @input="emit('update:exportFeeYear', $event.target.value)"
          />
          <button
            type="button"
            class="shrink-0 rounded-xl border border-emerald-600 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 active:bg-emerald-50 disabled:opacity-60"
            :disabled="exportingFeeYear"
            @click="emit('export-fee-year')"
          >
            {{ exportingFeeYear ? '导出中…' : '年表' }}
          </button>
        </div>
      </div>
    </section>

    <ul class="space-y-2">
      <li
        v-for="item in records"
        :key="item.id"
        class="rounded-xl border border-slate-200 bg-white p-3 text-sm"
      >
        <button type="button" class="w-full text-left" @click="emit('open-record', item)">
          <div class="flex items-start justify-between gap-2">
            <p class="font-medium text-slate-900">{{ item.course || '（未填写课程）' }}</p>
            <span
              class="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
              :class="item.lessonType === 'retail' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'"
            >
              {{ item.lessonType === 'retail' ? '零售' : '常规' }}
            </span>
          </div>
          <p class="text-xs text-slate-500">{{ item.lessonSchedule || '未填写时间段' }}</p>
          <p v-if="item.lessonDate" class="text-xs text-slate-400 mt-0.5">{{ item.lessonDate }}</p>
        </button>
      </li>
      <li v-if="!records.length" class="text-xs text-slate-400">暂无记录</li>
    </ul>
  </section>
</template>
