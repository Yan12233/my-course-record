export function normalizeFeeNumber(v) {
  const n = parseFloat(String(v ?? '').trim());
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

export function normalizeHeadCount(v) {
  const n = parseInt(String(v ?? '').trim(), 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(99, n);
}

/** 零售课计费人数（优先 headCount，旧数据回退学生名单人数） */
export function getRetailHeadCount(record) {
  if (!record) return 0;
  const explicit = normalizeHeadCount(record.headCount);
  if (explicit > 0) return explicit;
  if (Array.isArray(record.students) && record.students.length > 0) {
    return record.students.length;
  }
  return 0;
}

/**
 * 计算本节课总课时费
 * - 常规课：课时 × 单价（元/课时）
 * - 零售课：课时 × 人数 × 每人每课时费用（元/课时/人）
 */
export function computeLessonFee({ lessonType, classHours, feeRate, studentCount, headCount }) {
  const hours = normalizeFeeNumber(classHours);
  const rate = normalizeFeeNumber(feeRate);
  if (!hours || !rate) return 0;

  if (lessonType === 'retail') {
    const count =
      headCount !== undefined && headCount !== null
        ? normalizeHeadCount(headCount)
        : normalizeHeadCount(studentCount);
    if (!count) return 0;
    return normalizeFeeNumber(hours * count * rate);
  }

  return normalizeFeeNumber(hours * rate);
}

export function formatLessonFeeBreakdown(record) {
  if (!record) return '';
  const hours = normalizeFeeNumber(record.classHours);
  const rate = normalizeFeeNumber(record.feeRate);
  const total = normalizeFeeNumber(record.classFee);
  if (!total && !hours) return '';

  if (record.lessonType === 'retail') {
    const count = getRetailHeadCount(record);
    if (hours && rate && count) {
      return `${hours}课时 × ${count}人 × ¥${rate}/人·课时 = ¥${total || computeLessonFee({ lessonType: 'retail', classHours: hours, feeRate: rate, headCount: count })}`;
    }
  } else if (hours && rate) {
    return `${hours}课时 × ¥${rate} = ¥${total || computeLessonFee({ lessonType: 'regular', classHours: hours, feeRate: rate })}`;
  }

  if (total) return `¥${total}`;
  return '';
}
