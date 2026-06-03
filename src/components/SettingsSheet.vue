<script setup>
import RecordsLibrary from './RecordsLibrary.vue';

defineProps({
  visible: { type: Boolean, default: false },
  records: { type: Array, default: () => [] },
  filterText: { type: String, default: '' },
  exportMonth: { type: String, default: '' },
  exportFeeYear: { type: String, default: '' },
  exportingZip: { type: Boolean, default: false },
  exportingFeeMonth: { type: Boolean, default: false },
  exportingFeeYear: { type: Boolean, default: false },
});

const emit = defineEmits([
  'close',
  'open-timetable',
  'open-batch-import',
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
  <div
    class="fixed inset-0 z-[150] flex flex-col justify-end bg-slate-900/50"
    :class="visible ? '' : 'hidden'"
    @click="emit('close')"
  >
    <div
      class="max-h-[88dvh] overflow-y-auto rounded-t-2xl bg-slate-50 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
      @click.stop
    >
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-slate-900">更多功能</h2>
        <button
          type="button"
          class="rounded-lg p-1.5 text-slate-500 hover:bg-white"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <div class="space-y-3 mb-4">
        <button
          type="button"
          class="w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 text-left text-sm font-medium text-indigo-800 active:bg-indigo-50"
          @click="emit('open-timetable')"
        >
          📅 我的课表
        </button>
        <button
          type="button"
          class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600 active:bg-slate-50"
          @click="emit('open-batch-import')"
        >
          批量补录（开发中）
        </button>
      </div>

      <RecordsLibrary
        :records="records"
        :filter-text="filterText"
        :export-month="exportMonth"
        :export-fee-year="exportFeeYear"
        :exporting-zip="exportingZip"
        :exporting-fee-month="exportingFeeMonth"
        :exporting-fee-year="exportingFeeYear"
        @update:filter-text="emit('update:filterText', $event)"
        @update:export-month="emit('update:exportMonth', $event)"
        @update:export-fee-year="emit('update:exportFeeYear', $event)"
        @export-month-zip="emit('export-month-zip')"
        @export-fee-month="emit('export-fee-month')"
        @export-fee-year="emit('export-fee-year')"
        @refresh="emit('refresh')"
        @backup="emit('backup')"
        @restore="emit('restore')"
        @open-record="emit('open-record')"
      />
    </div>
  </div>
</template>
