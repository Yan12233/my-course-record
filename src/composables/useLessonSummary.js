import { computed } from 'vue';
import { getRecordIsoDate, recordBelongsToDate, recordBelongsToMonth } from '../utils/lessonDate';

function normalizeNonNegativeNumber(v) {
  const n = parseFloat(v);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

export function sumRecords(records, options = {}) {
  const list = Array.isArray(records) ? records : [];
  const { yearMonth, isoDate } = options;
  let totalHours = 0;
  let totalFee = 0;
  let count = 0;

  for (let i = 0; i < list.length; i++) {
    const rec = list[i];
    if (!rec) continue;
    if (yearMonth && !recordBelongsToMonth(rec, yearMonth)) continue;
    if (isoDate && !recordBelongsToDate(rec, isoDate)) continue;
    totalHours += normalizeNonNegativeNumber(rec.classHours);
    totalFee += normalizeNonNegativeNumber(rec.classFee);
    count += 1;
  }

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    totalFee: Math.round(totalFee * 100) / 100,
    count,
  };
}

export function buildRecordsByDateMap(records, yearMonth) {
  const map = {};
  const list = Array.isArray(records) ? records : [];
  for (let i = 0; i < list.length; i++) {
    const rec = list[i];
    if (!rec) continue;
    if (yearMonth && !recordBelongsToMonth(rec, yearMonth)) continue;
    const iso = getRecordIsoDate(rec);
    if (!iso) continue;
    if (!map[iso]) map[iso] = [];
    map[iso].push(rec);
  }
  return map;
}

export function useLessonSummary(recordsRef, yearMonthRef, isoDateRef) {
  const monthSummary = computed(() =>
    sumRecords(recordsRef.value, { yearMonth: yearMonthRef.value }),
  );

  const daySummary = computed(() => {
    const iso = isoDateRef?.value;
    if (!iso) return { totalHours: 0, totalFee: 0, count: 0 };
    return sumRecords(recordsRef.value, { isoDate: iso });
  });

  const recordsByDate = computed(() => buildRecordsByDateMap(recordsRef.value, yearMonthRef.value));

  return {
    monthSummary,
    daySummary,
    recordsByDate,
    sumRecords,
    buildRecordsByDateMap,
  };
}
