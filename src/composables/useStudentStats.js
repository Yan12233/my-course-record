/**
 * 学生搜索与跨记录聚合
 * 姓名匹配策略：trim + toLowerCase + 精确匹配为主，搜索时支持前缀/包含匹配
 */

/**
 * 模糊搜索学生姓名
 * @param {Array} records - 所有记录
 * @param {string} query - 搜索关键词
 * @returns {Array<{name: string, normalized: string, score: number, lessonCount: number}>}
 */
export function findStudentNames(records, query) {
  const list = Array.isArray(records) ? records : [];
  const q = String(query || '').trim().toLowerCase();
  const nameMap = {};

  for (let i = 0; i < list.length; i++) {
    const rec = list[i];
    if (!rec || !Array.isArray(rec.students)) continue;
    for (let j = 0; j < rec.students.length; j++) {
      const s = rec.students[j];
      if (!s) continue;
      const normalized = String(s.name || '').trim().toLowerCase();
      if (!normalized) continue;
      if (!nameMap[normalized]) {
        nameMap[normalized] = { name: s.name.trim(), normalized, score: 0, lessonCount: 0 };
      }
      nameMap[normalized].lessonCount += 1;
    }
  }

  let results = Object.values(nameMap);

  if (q) {
    results = results
      .filter((item) => item.normalized.includes(q) || q.includes(item.normalized))
      .map((item) => {
        let score = 0;
        if (item.normalized === q) score = 3;
        else if (item.normalized.startsWith(q)) score = 2;
        else if (item.normalized.includes(q)) score = 1;
        else if (q.includes(item.normalized)) score = 1;
        return { ...item, score };
      })
      .sort((a, b) => b.score - a.score || b.lessonCount - a.lessonCount);
  } else {
    results = results.sort((a, b) => b.lessonCount - a.lessonCount || a.name.localeCompare(b.name));
  }

  return results;
}

/**
 * 查找某学生参与的所有记录
 * @param {Array} records - 所有记录
 * @param {string} studentName - 学生姓名（精确匹配）
 * @returns {Array} 按日期降序排列的记录
 */
export function findRecordsByStudent(records, studentName) {
  const list = Array.isArray(records) ? records : [];
  const q = String(studentName || '').trim().toLowerCase();
  if (!q) return [];

  return list
    .filter((rec) => {
      if (!rec || !Array.isArray(rec.students)) return false;
      return rec.students.some((s) => s && String(s.name || '').trim().toLowerCase() === q);
    })
    .sort((a, b) => {
      const da = getRecordIsoDate(a) || '';
      const db = getRecordIsoDate(b) || '';
      return db.localeCompare(da) || ((b.createdAt || 0) - (a.createdAt || 0));
    });
}

/**
 * 聚合某学生的统计数据
 */
export function aggregateStudentStats(records, studentName) {
  const recs = findRecordsByStudent(records, studentName);
  return {
    count: recs.length,
    totalHours: round1(recs.reduce((s, r) => s + (r.classHours || 0), 0)),
    totalFee: round1(recs.reduce((s, r) => s + (r.classFee || 0), 0)),
  };
}

/**
 * 获取某学生的课程列表（去重）
 */
export function getStudentCourses(records, studentName) {
  const recs = findRecordsByStudent(records, studentName);
  const set = new Set();
  for (let i = 0; i < recs.length; i++) {
    const c = recs[i]?.course;
    if (c && c !== '（未填写课程）') set.add(c);
  }
  return Array.from(set);
}

function getRecordIsoDate(record) {
  if (!record) return '';
  const ld = record.lessonDate && typeof record.lessonDate === 'string' ? record.lessonDate.trim() : '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(ld)) return ld;
  if (record.datetime) {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(record.datetime).trim());
    if (m) return m[1];
  }
  if (typeof record.createdAt === 'number' && !Number.isNaN(record.createdAt)) {
    const d = new Date(record.createdAt);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return '';
}

function round1(v) {
  return Math.round(Number(v) * 10) / 10;
}
