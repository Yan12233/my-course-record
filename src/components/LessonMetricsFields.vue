<script setup>
import { computed } from 'vue';
import { computeLessonFee, normalizeFeeNumber, normalizeHeadCount } from '../utils/lessonFee';

const props = defineProps({
  lessonType: { type: String, default: 'regular' },
  classHours: { type: [Number, String], default: '' },
  feeRate: { type: [Number, String], default: '' },
  headCount: { type: [Number, String], default: 1 },
});

const emit = defineEmits(['update:classHours', 'update:feeRate', 'update:headCount']);

const headCountOptions = Array.from({ length: 30 }, (_, i) => i + 1);

const headCountValue = computed(() => {
  const n = normalizeHeadCount(props.headCount);
  return n > 0 ? n : 1;
});

const computedTotal = computed(() =>
  computeLessonFee({
    lessonType: props.lessonType,
    classHours: props.classHours,
    feeRate: props.feeRate,
    headCount: props.lessonType === 'retail' ? headCountValue.value : 0,
  }),
);

const breakdownText = computed(() => {
  const hours = normalizeFeeNumber(props.classHours);
  const rate = normalizeFeeNumber(props.feeRate);
  const total = computedTotal.value;
  if (!hours || !rate || !total) return '';

  if (props.lessonType === 'retail') {
    const count = headCountValue.value;
    return `${hours} 课时 × ${count} 人 × ¥${rate}/人·课时 = ¥${total}`;
  }
  return `${hours} 课时 × ¥${rate} = ¥${total}`;
});

function onHeadCountChange(e) {
  emit('update:headCount', e.target.value);
}

function stepHeadCount(delta) {
  const next = Math.max(1, Math.min(30, headCountValue.value + delta));
  emit('update:headCount', String(next));
}
</script>

<template>
  <section class="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
    <template v-if="lessonType === 'retail'">
      <label class="block space-y-1">
        <span class="text-xs font-medium text-slate-700">课时</span>
        <input
          type="text"
          inputmode="decimal"
          placeholder="如 2"
          autocomplete="off"
          class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          :value="classHours"
          @input="emit('update:classHours', $event.target.value)"
        />
      </label>
      <div class="space-y-1">
        <span class="text-xs font-medium text-slate-700">上课人数</span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="h-11 w-11 shrink-0 rounded-xl border border-slate-300 bg-white text-lg font-semibold text-slate-700 active:bg-slate-50"
            aria-label="减少人数"
            @click="stepHeadCount(-1)"
          >
            −
          </button>
          <select
            class="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            :value="headCountValue"
            @change="onHeadCountChange"
          >
            <option v-for="n in headCountOptions" :key="n" :value="n">{{ n }} 人</option>
          </select>
          <button
            type="button"
            class="h-11 w-11 shrink-0 rounded-xl border border-slate-300 bg-white text-lg font-semibold text-slate-700 active:bg-slate-50"
            aria-label="增加人数"
            @click="stepHeadCount(1)"
          >
            +
          </button>
        </div>
      </div>
      <label class="block space-y-1">
        <span class="text-xs font-medium text-slate-700">每人每课时费用（元）</span>
        <input
          type="text"
          inputmode="decimal"
          placeholder="如 14"
          autocomplete="off"
          class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          :value="feeRate"
          @input="emit('update:feeRate', $event.target.value)"
        />
      </label>
      <p class="text-xs text-slate-500">零售课课时费 = 课时 × 人数 × 每人每课时费用</p>
    </template>

    <template v-else>
      <div class="grid grid-cols-2 gap-3">
        <label class="space-y-1">
          <span class="text-xs font-medium text-slate-700">课时</span>
          <input
            type="text"
            inputmode="decimal"
            placeholder="如 1.5"
            autocomplete="off"
            class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            :value="classHours"
            @input="emit('update:classHours', $event.target.value)"
          />
        </label>
        <label class="space-y-1">
          <span class="text-xs font-medium text-slate-700">单价（元/课时）</span>
          <input
            type="text"
            inputmode="decimal"
            placeholder="如 60"
            autocomplete="off"
            class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            :value="feeRate"
            @input="emit('update:feeRate', $event.target.value)"
          />
        </label>
      </div>
      <p class="text-xs text-slate-500">常规课课时费 = 课时 × 单价</p>
    </template>

    <p v-if="breakdownText" class="text-xs font-semibold text-emerald-800">{{ breakdownText }}</p>
  </section>
</template>
