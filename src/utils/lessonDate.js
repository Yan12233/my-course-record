export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function formatIsoLocalDate(d) {
  const x = d instanceof Date ? d : new Date();
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
}

export function formatYearMonth(d) {
  const x = d instanceof Date ? d : new Date();
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}`;
}

export function deriveLessonDateFromDatetimeStr(dtStr) {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(dtStr || '').trim());
  return m ? m[1] : '';
}

export function normalizeLessonDateIso(raw) {
  const s = String(raw || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

export function getRecordIsoDate(record) {
  if (!record) return '';
  const ld = record.lessonDate && typeof record.lessonDate === 'string' ? record.lessonDate.trim() : '';
  const iso = normalizeLessonDateIso(ld);
  if (iso) return iso;
  if (record.datetime) {
    return deriveLessonDateFromDatetimeStr(record.datetime);
  }
  if (typeof record.createdAt === 'number' && !Number.isNaN(record.createdAt)) {
    return formatIsoLocalDate(new Date(record.createdAt));
  }
  return '';
}

export function recordBelongsToMonth(record, yearMonth) {
  if (!record || !yearMonth) return false;
  const iso = getRecordIsoDate(record);
  if (iso) return iso.substring(0, 7) === yearMonth;
  const dt = record.datetime;
  if (typeof dt === 'string' && dt.length >= 7) return dt.substring(0, 7) === yearMonth;
  if (typeof record.createdAt === 'number' && !Number.isNaN(record.createdAt)) {
    const d = new Date(record.createdAt);
    return formatYearMonth(d) === yearMonth;
  }
  return false;
}

export function recordBelongsToDate(record, isoDate) {
  if (!record || !isoDate) return false;
  return getRecordIsoDate(record) === isoDate;
}

export function recordBelongsToYear(record, year) {
  if (!record || !year) return false;
  const y = String(year).trim();
  if (!/^\d{4}$/.test(y)) return false;
  const iso = getRecordIsoDate(record);
  if (iso) return iso.substring(0, 4) === y;
  const dt = record.datetime;
  if (typeof dt === 'string' && dt.length >= 4) return dt.substring(0, 4) === y;
  if (typeof record.createdAt === 'number' && !Number.isNaN(record.createdAt)) {
    return String(new Date(record.createdAt).getFullYear()) === y;
  }
  return false;
}

export function shiftYearMonth(ym, delta) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(ym || '').trim());
  if (!m) return formatYearMonth(new Date());
  let y = parseInt(m[1], 10);
  let mo = parseInt(m[2], 10) - 1 + delta;
  while (mo < 0) {
    mo += 12;
    y -= 1;
  }
  while (mo > 11) {
    mo -= 12;
    y += 1;
  }
  return `${y}-${pad2(mo + 1)}`;
}

export function buildCalendarCells(yearMonth) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(yearMonth || '').trim());
  if (!m) return [];
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();
  let startWeekday = first.getDay();
  startWeekday = startWeekday === 0 ? 6 : startWeekday - 1;

  const cells = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ iso: '', day: 0, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      iso: `${year}-${pad2(month + 1)}-${pad2(d)}`,
      day: d,
      inMonth: true,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ iso: '', day: 0, inMonth: false });
  }
  return cells;
}
