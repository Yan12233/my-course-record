import { getRecordIsoDate, recordBelongsToMonth, recordBelongsToYear, formatYearMonth, pad2 } from '../utils/lessonDate';

/**
 * 按月汇总课时和费用
 * yearFilter 例如 '2026' → 返回该年1-12月数据
 * yearFilter 为 null → 返回最近12个月
 */
export function getMonthlyTrend(records, yearFilter) {
  const list = Array.isArray(records) ? records : [];

  if (yearFilter && /^\d{4}$/.test(String(yearFilter))) {
    const y = String(yearFilter);
    const result = [];
    for (let m = 1; m <= 12; m++) {
      const ym = `${y}-${pad2(m)}`;
      const inMonth = list.filter((r) => recordBelongsToMonth(r, ym));
      result.push({
        month: ym,
        label: `${m}月`,
        hours: round1(inMonth.reduce((s, r) => s + (r.classHours || 0), 0)),
        fee: round1(inMonth.reduce((s, r) => s + (r.classFee || 0), 0)),
        count: inMonth.length,
      });
    }
    return result;
  }

  // 最近12个月
  const now = new Date();
  const result = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = formatYearMonth(d);
    const inMonth = list.filter((r) => recordBelongsToMonth(r, ym));
    result.push({
      month: ym,
      label: `${d.getMonth() + 1}月`,
      hours: round1(inMonth.reduce((s, r) => s + (r.classHours || 0), 0)),
      fee: round1(inMonth.reduce((s, r) => s + (r.classFee || 0), 0)),
      count: inMonth.length,
    });
  }
  return result;
}

/**
 * 课程分布分析
 */
export function getCourseBreakdown(records, yearFilter) {
  const list = Array.isArray(records) ? records : [];
  const filtered = yearFilter && /^\d{4}$/.test(String(yearFilter))
    ? list.filter((r) => recordBelongsToYear(r, String(yearFilter)))
    : list;

  const groups = {};
  for (let i = 0; i < filtered.length; i++) {
    const rec = filtered[i];
    if (!rec) continue;
    const course = rec.course && rec.course !== '（未填写课程）' ? rec.course : '其他';
    if (!groups[course]) groups[course] = { hours: 0, fee: 0, count: 0 };
    groups[course].hours += rec.classHours || 0;
    groups[course].fee += rec.classFee || 0;
    groups[course].count += 1;
  }

  const totalHours = Object.values(groups).reduce((s, g) => s + g.hours, 0);
  const totalFee = Object.values(groups).reduce((s, g) => s + g.fee, 0);

  return Object.entries(groups)
    .map(([course, g]) => ({
      course,
      hours: round1(g.hours),
      fee: round1(g.fee),
      count: g.count,
      hoursPercent: totalHours > 0 ? round1((g.hours / totalHours) * 100) : 0,
      feePercent: totalFee > 0 ? round1((g.fee / totalFee) * 100) : 0,
    }))
    .sort((a, b) => b.fee - a.fee);
}

/**
 * 常规课 vs 零售课对比
 */
export function getTypeComparison(records, yearFilter) {
  const list = Array.isArray(records) ? records : [];
  const filtered = yearFilter && /^\d{4}$/.test(String(yearFilter))
    ? list.filter((r) => recordBelongsToYear(r, String(yearFilter)))
    : list;

  const result = { regular: { hours: 0, fee: 0, count: 0 }, retail: { hours: 0, fee: 0, count: 0 } };

  for (let i = 0; i < filtered.length; i++) {
    const rec = filtered[i];
    if (!rec) continue;
    const bucket = rec.lessonType === 'retail' ? 'retail' : 'regular';
    result[bucket].hours += rec.classHours || 0;
    result[bucket].fee += rec.classFee || 0;
    result[bucket].count += 1;
  }

  result.regular.hours = round1(result.regular.hours);
  result.regular.fee = round1(result.regular.fee);
  result.retail.hours = round1(result.retail.hours);
  result.retail.fee = round1(result.retail.fee);

  return result;
}

/**
 * 指定月份的详细汇总
 */
export function getMonthSummary(records, yearMonth) {
  const list = Array.isArray(records) ? records : [];
  const inMonth = list.filter((r) => recordBelongsToMonth(r, yearMonth));

  const regular = { hours: 0, fee: 0, count: 0 };
  const retail = { hours: 0, fee: 0, count: 0 };
  let daysSet = new Set();

  for (let i = 0; i < inMonth.length; i++) {
    const rec = inMonth[i];
    if (!rec) continue;
    const bucket = rec.lessonType === 'retail' ? retail : regular;
    bucket.hours += rec.classHours || 0;
    bucket.fee += rec.classFee || 0;
    bucket.count += 1;
    const iso = getRecordIsoDate(rec);
    if (iso) daysSet.add(iso);
  }

  return {
    yearMonth,
    count: inMonth.length,
    totalHours: round1(regular.hours + retail.hours),
    totalFee: round1(regular.fee + retail.fee),
    regularHours: round1(regular.hours),
    regularFee: round1(regular.fee),
    regularCount: regular.count,
    retailHours: round1(retail.hours),
    retailFee: round1(retail.fee),
    retailCount: retail.count,
    daysWithLessons: daysSet.size,
  };
}

function round1(v) {
  return Math.round(Number(v) * 10) / 10;
}
