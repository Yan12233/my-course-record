import { computed } from 'vue';
import { computeLessonFee, normalizeFeeNumber, normalizeHeadCount } from '../utils/lessonFee';

const HEAD_COUNT_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1);

/**
 * 人数的双向绑定计算：将 ref 值转为归一化的数字
 */
function useNormalizedHeadCount(headCountRef) {
  const headCountValue = computed(() => {
    const n = normalizeHeadCount(headCountRef.value);
    return n > 0 ? n : 1;
  });

  function stepHeadCount(delta) {
    const next = Math.max(1, Math.min(30, headCountValue.value + delta));
    return String(next);
  }

  return { headCountValue, stepHeadCount };
}

/**
 * 课时费预览计算：根据常规课/零售课自动计算并展示分解公式文字
 * @param {import('vue').Ref<string>} lessonTypeRef - 'regular' | 'retail'
 * @param {import('vue').Ref<string|number>} classHoursRef
 * @param {import('vue').Ref<string|number>} feeRateRef
 * @param {import('vue').Ref<string|number>} headCountRef - 仅零售课有效
 */
export function useLessonFeeDisplay(lessonTypeRef, classHoursRef, feeRateRef, headCountRef) {
  const { headCountValue, stepHeadCount } = useNormalizedHeadCount(headCountRef);

  const computedTotal = computed(() =>
    computeLessonFee({
      lessonType: lessonTypeRef.value,
      classHours: classHoursRef.value,
      feeRate: feeRateRef.value,
      headCount: lessonTypeRef.value === 'retail' ? headCountValue.value : 0,
    }),
  );

  const breakdownText = computed(() => {
    const hours = normalizeFeeNumber(classHoursRef.value);
    const rate = normalizeFeeNumber(feeRateRef.value);
    const total = computedTotal.value;
    if (!hours || !rate || !total) return '';

    if (lessonTypeRef.value === 'retail') {
      const count = headCountValue.value;
      return `${hours} 课时 × ${count} 人 × ¥${rate}/人·课时 = ¥${total}`;
    }
    return `${hours} 课时 × ¥${rate} = ¥${total}`;
  });

  return {
    headCountOptions: HEAD_COUNT_OPTIONS,
    headCountValue,
    computedTotal,
    breakdownText,
    stepHeadCount,
  };
}
