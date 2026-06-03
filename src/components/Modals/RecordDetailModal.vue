<script setup>
import { computed } from 'vue';
import { computeLessonFee, normalizeFeeNumber, normalizeHeadCount } from '../../utils/lessonFee';

const props = defineProps({
  visible: { type: Boolean, default: false },
  record: { type: Object, default: null },
  editValues: {
    type: Object,
    default: () => ({
      course: '',
      lessonSchedule: '',
      lessonDate: '',
      lessonType: 'regular',
      classHours: '',
      feeRate: '',
      headCount: '1',
    }),
  },
  imageUrl: { type: String, default: '' },
  imageHint: { type: String, default: '' },
  removeImageDisabled: { type: Boolean, default: false },
});

const emit = defineEmits([
  'close',
  'save',
  'delete',
  'copy',
  'share',
  'update:course',
  'update:lessonSchedule',
  'update:lessonDate',
  'update:lessonType',
  'update:classHours',
  'update:feeRate',
  'update:headCount',
  'replace-image',
  'remove-image',
]);

const headCountOptions = Array.from({ length: 30 }, (_, i) => i + 1);

const headCountValue = computed(() => {
  const n = normalizeHeadCount(props.editValues.headCount);
  return n > 0 ? n : 1;
});

const computedTotal = computed(() =>
  computeLessonFee({
    lessonType: props.editValues.lessonType,
    classHours: props.editValues.classHours,
    feeRate: props.editValues.feeRate,
    headCount: props.editValues.lessonType === 'retail' ? headCountValue.value : 0,
  }),
);

const breakdownText = computed(() => {
  const hours = normalizeFeeNumber(props.editValues.classHours);
  const rate = normalizeFeeNumber(props.editValues.feeRate);
  const total = computedTotal.value;
  if (!hours || !rate || !total) return '';

  if (props.editValues.lessonType === 'retail') {
    return `${hours} 课时 × ${headCountValue.value} 人 × ¥${rate}/人·课时 = ¥${total}`;
  }
  return `${hours} 课时 × ¥${rate} = ¥${total}`;
});

function onReplaceImageChange(e) {
  const file = e.target?.files?.[0] || null;
  if (file) emit('replace-image', file);
}

function stepHeadCount(delta) {
  const next = Math.max(1, Math.min(30, headCountValue.value + delta));
  emit('update:headCount', String(next));
}
</script>

<template>
  <div
    class="fixed inset-0 z-[160] flex items-stretch justify-center bg-slate-900/65 p-0 sm:p-4"
    :class="visible ? '' : 'hidden'"
    @click="emit('close')"
  >
    <div
      class="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl"
      role="dialog"
      aria-modal="true"
      @click.stop
    >
      <div class="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <h2 class="text-lg font-semibold text-slate-900">记录详情</h2>
        <button type="button" class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" @click="emit('close')">✕</button>
      </div>
      <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <label class="space-y-1">
          <span class="text-xs text-slate-500">课程</span>
          <input
            type="text"
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            :value="editValues.course"
            @input="emit('update:course', $event.target.value)"
          />
        </label>
        <label class="space-y-1">
          <span class="text-xs text-slate-500">时间段 / 班级</span>
          <input
            type="text"
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            :value="editValues.lessonSchedule"
            @input="emit('update:lessonSchedule', $event.target.value)"
          />
        </label>
        <label class="space-y-1">
          <span class="text-xs text-slate-500">上课日期</span>
          <input
            type="text"
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            :value="editValues.lessonDate"
            @input="emit('update:lessonDate', $event.target.value)"
          />
        </label>
        <div class="space-y-1">
          <span class="text-xs text-slate-500">课程类型</span>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="rounded-lg border-2 py-2 text-xs font-semibold"
              :class="
                editValues.lessonType === 'regular'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                  : 'border-slate-200 text-slate-600'
              "
              @click="emit('update:lessonType', 'regular')"
            >
              常规课
            </button>
            <button
              type="button"
              class="rounded-lg border-2 py-2 text-xs font-semibold"
              :class="
                editValues.lessonType === 'retail'
                  ? 'border-amber-500 bg-amber-50 text-amber-900'
                  : 'border-slate-200 text-slate-600'
              "
              @click="emit('update:lessonType', 'retail')"
            >
              零售课
            </button>
          </div>
        </div>

        <template v-if="editValues.lessonType === 'retail'">
          <label class="space-y-1">
            <span class="text-xs text-slate-500">课时</span>
            <input
              type="text"
              inputmode="decimal"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              :value="editValues.classHours"
              @input="emit('update:classHours', $event.target.value)"
            />
          </label>
          <div class="space-y-1">
            <span class="text-xs text-slate-500">上课人数</span>
            <div class="flex items-center gap-2">
              <button type="button" class="h-9 w-9 rounded-lg border border-slate-300 text-slate-700" @click="stepHeadCount(-1)">−</button>
              <select
                class="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                :value="headCountValue"
                @change="emit('update:headCount', $event.target.value)"
              >
                <option v-for="n in headCountOptions" :key="n" :value="n">{{ n }} 人</option>
              </select>
              <button type="button" class="h-9 w-9 rounded-lg border border-slate-300 text-slate-700" @click="stepHeadCount(1)">+</button>
            </div>
          </div>
          <label class="space-y-1">
            <span class="text-xs text-slate-500">每人每课时费用（元）</span>
            <input
              type="text"
              inputmode="decimal"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              :value="editValues.feeRate"
              @input="emit('update:feeRate', $event.target.value)"
            />
          </label>
        </template>
        <div v-else class="grid grid-cols-2 gap-2">
          <label class="space-y-1">
            <span class="text-xs text-slate-500">课时</span>
            <input
              type="text"
              inputmode="decimal"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              :value="editValues.classHours"
              @input="emit('update:classHours', $event.target.value)"
            />
          </label>
          <label class="space-y-1">
            <span class="text-xs text-slate-500">单价（元/课时）</span>
            <input
              type="text"
              inputmode="decimal"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              :value="editValues.feeRate"
              @input="emit('update:feeRate', $event.target.value)"
            />
          </label>
        </div>
        <p v-if="breakdownText" class="text-xs font-medium text-emerald-700">{{ breakdownText }}</p>

        <div class="rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-2">
          <img
            v-if="imageUrl"
            :src="imageUrl"
            alt="记录附图"
            class="w-full max-h-64 rounded-lg object-contain bg-white"
          />
          <div v-else class="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
            当前无图片
          </div>
          <p class="text-[11px] text-slate-500">{{ imageHint }}</p>
          <div class="flex flex-wrap gap-2">
            <label class="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs text-indigo-700 cursor-pointer">
              更换图片
              <input type="file" accept="image/*" class="hidden" @change="onReplaceImageChange" />
            </label>
            <button
              type="button"
              class="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs text-rose-700 disabled:opacity-50"
              :disabled="removeImageDisabled"
              @click="emit('remove-image')"
            >
              移除图片
            </button>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs" @click="emit('copy')">复制文案</button>
          <button type="button" class="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs text-indigo-700" @click="emit('share')">转发微信</button>
          <button type="button" class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white" @click="emit('save')">保存修改</button>
          <button type="button" class="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs text-rose-700" @click="emit('delete')">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>
