import { useImageHandler } from './useImageHandler';
import {
  deriveLessonDateFromDatetimeStr,
  getRecordIsoDate,
  pad2,
  recordBelongsToMonth,
  recordBelongsToYear,
} from '../utils/lessonDate';
import { getRetailHeadCount } from '../utils/lessonFee';

export function useExport() {
  const { parseDataUrlForZip } = useImageHandler();
  let ExcelJSModule = null;
  let JSZipModule = null;
  let saveAsFn = null;

  async function getExcelJS() {
    if (!ExcelJSModule) {
      const mod = await import('exceljs');
      ExcelJSModule = mod.default || mod;
    }
    return ExcelJSModule;
  }

  async function getJSZip() {
    if (!JSZipModule) {
      const mod = await import('jszip');
      JSZipModule = mod.default || mod;
    }
    return JSZipModule;
  }

  async function getSaveAs() {
    if (!saveAsFn) {
      const mod = await import('file-saver');
      saveAsFn = mod.saveAs || mod.default;
    }
    return saveAsFn;
  }

  function sanitizeExcelFileNamePart(v, fallback) {
    let s = String(v == null ? '' : v).trim();
    s = s.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ');
    if (!s) return fallback || '未命名';
    return s;
  }

  function buildFeedbackExcelFilename(formData) {
    const names = [];
    for (let i = 0; i < formData.students.length && names.length < 3; i++) {
      const n = sanitizeExcelFileNamePart(formData.students[i].name, '');
      if (n) names.push(n);
    }
    const namesText = names.length ? names.join('、') : '无学生';
    const classSchedule = sanitizeExcelFileNamePart(formData.classSchedule, '未填班次');
    const subject = sanitizeExcelFileNamePart(formData.subject, '未填科目');
    const teacher = sanitizeExcelFileNamePart(formData.teacher, '未填教师');
    return `${classSchedule}${subject}(${teacher})——${namesText}.xlsx`;
  }

  function buildFeedbackExcelData(formData) {
    const excelData = [
      ['四川省人工智能-信息学科普基地（课堂反馈表）', null, null, null],
      ['校区', '线下', '科目', formData.subject],
      ['班次', formData.classSchedule, '教师', formData.teacher],
      ['上课时间', formData.classTime, '咨询教务', formData.admin || '林玲'],
      ['本次课程\n授课内容', formData.courseContent, null, null],
      ['本次课程学生整体学习情况、改进意见（授课老师填写）', null, null, null],
      ['学生姓名', '课堂整体学习情况', '做题完成情况'],
    ];
    formData.students.forEach((student) => {
      const homeworkText =
        `上节课课后作业：${student.hwDone}/${student.hwTotal}` +
        `\n本节课课堂练习完成情况：${student.cwDone}/${student.cwTotal}`;
      excelData.push([student.name, student.feedback, homeworkText]);
    });
    excelData.push(['改进跟进情况（教务老师填写）', null, null]);
    excelData.push(['学生姓名', '改进跟进情况', null]);
    excelData.push(['XXX', 'XXX', null]);
    excelData.push(['XXX', 'XXX', null]);
    return excelData;
  }

  async function exportFeedbackExcel(formData) {
    if (!formData || !String(formData.subject || '').trim()) {
      throw new Error('请先填写科目');
    }

    const ExcelJS = await getExcelJS();
    const saveAs = await getSaveAs();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('课堂反馈表', {
      views: [{ showGridLines: false }],
    });
    worksheet.columns = [
      { width: 16 },
      { width: 34 },
      { width: 16 },
      { width: 42 },
    ];
    const titleFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' },
    };
    const fontTitle = { name: '等线', size: 14 };
    const fontDefault = { name: '宋体', size: 12 };
    const alignCenter = { vertical: 'middle', horizontal: 'center', wrapText: true };
    const alignLeft = { vertical: 'middle', horizontal: 'left', wrapText: true };

    worksheet.mergeCells('A1:D1');
    const cell1 = worksheet.getCell('A1');
    cell1.value = '四川省人工智能-信息学科普基地（课堂反馈表）';
    cell1.font = fontTitle;
    cell1.fill = titleFill;
    cell1.alignment = alignCenter;
    worksheet.getRow(1).height = 30;

    const infos = [
      ['校区', '线下', '科目', formData.subject],
      ['班次', formData.classSchedule, '教师', formData.teacher],
      ['上课时间', formData.classTime, '咨询教务', formData.admin || '林玲'],
    ];
    infos.forEach((info) => {
      const row = worksheet.addRow(info);
      row.height = 20;
      row.eachCell((cell) => {
        cell.alignment = alignCenter;
      });
    });

    const contentLen = (formData.courseContent || '').length;
    const row5 = worksheet.addRow(['本次课程\n授课内容', formData.courseContent, '', '']);
    worksheet.mergeCells(`B${row5.number}:D${row5.number}`);
    row5.height = Math.max(60, Math.min(200, Math.ceil((contentLen || 1) / 40) * 14));
    row5.getCell(1).alignment = alignCenter;
    row5.getCell(2).alignment = alignLeft;

    const row6 = worksheet.addRow(['本次课程学生整体学习情况、改进意见（授课老师填写）', '', '', '']);
    worksheet.mergeCells(`A${row6.number}:D${row6.number}`);
    row6.getCell(1).fill = titleFill;
    row6.getCell(1).font = fontTitle;
    row6.getCell(1).alignment = alignCenter;
    row6.height = 25;

    const row7 = worksheet.addRow(['学生姓名', '课堂整体学习情况', '', '做题完成情况']);
    worksheet.mergeCells(`B${row7.number}:C${row7.number}`);
    row7.height = 20;
    row7.eachCell((cell) => {
      cell.alignment = alignCenter;
    });

    formData.students.forEach((student) => {
      const textLen = student.feedback ? student.feedback.length : 0;
      const singleRowHeight = Math.max(28, Math.min(120, Math.ceil(textLen / 30) * 14));
      const rowA = worksheet.addRow([
        student.name,
        student.feedback,
        '',
        `上节课课后作业：${student.hwDone}/${student.hwTotal}`,
      ]);
      rowA.height = singleRowHeight;
      const rowB = worksheet.addRow([
        '',
        '',
        '',
        `本节课课堂练习完成情况：${student.cwDone}/${student.cwTotal}`,
      ]);
      rowB.height = singleRowHeight;
      worksheet.mergeCells(`A${rowA.number}:A${rowB.number}`);
      worksheet.mergeCells(`B${rowA.number}:C${rowB.number}`);
      worksheet.getCell(`A${rowA.number}`).alignment = alignCenter;
      worksheet.getCell(`B${rowA.number}`).alignment = alignLeft;
      worksheet.getCell(`D${rowA.number}`).alignment = alignLeft;
      worksheet.getCell(`D${rowB.number}`).alignment = alignLeft;
    });

    const tail1 = worksheet.addRow(['改进跟进情况（教务老师填写）', '', '', '']);
    worksheet.mergeCells(`A${tail1.number}:D${tail1.number}`);
    tail1.getCell(1).fill = titleFill;
    tail1.getCell(1).font = fontTitle;
    tail1.getCell(1).alignment = alignCenter;
    tail1.height = 25;

    const tail2 = worksheet.addRow(['学生姓名', '改进跟进情况', '', '']);
    worksheet.mergeCells(`B${tail2.number}:D${tail2.number}`);
    tail2.height = 20;
    tail2.eachCell((cell) => {
      cell.alignment = alignCenter;
    });

    [1, 2].forEach(() => {
      const tailRow = worksheet.addRow(['', '', '', '']);
      worksheet.getCell(`A${tailRow.number}`).value = 'XXX';
      worksheet.mergeCells(`B${tailRow.number}:D${tailRow.number}`);
      tailRow.height = 30;
      tailRow.getCell(1).alignment = alignCenter;
    });

    worksheet.eachRow({ includeEmpty: true }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        if (!cell.font || cell.font.name !== '等线') {
          cell.font = fontDefault;
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };
      });
    });

    const fileName = buildFeedbackExcelFilename(formData);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, fileName);
    return fileName;
  }

  function safeFolderName(name) {
    let s = String(name == null ? '' : name).trim() || '未命名课程';
    s = s.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
    if (!s || s === '.' || s === '..') s = '未命名课程';
    return s;
  }

  function getExportCoursePrefix(courseRaw) {
    const raw = String(courseRaw == null ? '' : courseRaw).trim();
    if (!raw) return '';
    const normalized = raw.replace(/[()（）\s]/g, '');
    if (!normalized) return '';
    if (normalized === '未填写课程' || normalized === '未填课程') return '';
    return safeFolderName(raw);
  }

  function safeTimeSlotSegmentName(scheduleRaw) {
    let s = scheduleRaw && typeof scheduleRaw === 'string' ? scheduleRaw.trim() : '';
    if (!s) return '未填写时间段';
    s = s.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
    if (!s || s === '.' || s === '..') return '未填写时间段';
    return s;
  }

  function safeLessonDateFolderName(rec) {
    let raw = rec && typeof rec.lessonDate === 'string' ? rec.lessonDate.trim() : '';
    if (!raw && rec && rec.datetime) {
      raw = deriveLessonDateFromDatetimeStr(rec.datetime);
    }
    if (!raw) return '日期未填写';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    let s = raw.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
    if (!s || s === '.' || s === '..') return '日期未填写';
    if (s.length > 80) s = `${s.slice(0, 78)}..`;
    return s;
  }

  function buildLessonDateImageStem(rec) {
    return safeLessonDateFolderName(rec);
  }

  function buildExportClassFolderName(rec) {
    const classSafe = safeTimeSlotSegmentName(rec.lessonSchedule);
    const coursePrefix = getExportCoursePrefix(rec.course);
    const base = coursePrefix ? `${coursePrefix}-${classSafe}` : classSafe;
    if (rec && rec.lessonType === 'retail') {
      return `零售课/${base}`;
    }
    return base;
  }

  function escapeCsvCell(v) {
    const s = String(v == null ? '' : v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function buildMonthExportSummaryCsv(records) {
    const header = [
      '上课日期',
      '课程类型',
      '课程名',
      '班级或时间段',
      '课时',
      '人数',
      '每人每课时(元)',
      '课时费(元)',
      '教师',
      '反馈学生数',
      '含图片',
    ];
    const lines = [header.map(escapeCsvCell).join(',')];
    const list = Array.isArray(records) ? records : [];
    for (let i = 0; i < list.length; i++) {
      const rec = list[i];
      if (!rec) continue;
      const iso = getRecordIsoDate(rec) || safeLessonDateFolderName(rec);
      const typeLabel = rec.lessonType === 'retail' ? '零售课' : '常规课';
      const feedbackCount = Array.isArray(rec.students) ? rec.students.length : 0;
      const headCount = rec.lessonType === 'retail' ? getRetailHeadCount(rec) : '';
      const hasImage = typeof rec.imageBase64 === 'string' && rec.imageBase64.length > 0;
      const row = [
        iso,
        typeLabel,
        rec.course || '',
        rec.lessonSchedule || '',
        rec.classHours != null ? rec.classHours : '',
        headCount,
        rec.feeRate != null ? rec.feeRate : '',
        rec.classFee != null ? rec.classFee : '',
        rec.teacher || '',
        feedbackCount,
        hasImage ? '是' : '否',
      ];
      lines.push(row.map(escapeCsvCell).join(','));
    }
    return `\uFEFF${lines.join('\r\n')}`;
  }

  function sortRecordsByLessonDate(records) {
    return (Array.isArray(records) ? records : []).slice().sort((a, b) => {
      const da = getRecordIsoDate(a) || '';
      const db = getRecordIsoDate(b) || '';
      return da.localeCompare(db) || (a.createdAt || 0) - (b.createdAt || 0);
    });
  }

  function aggregateFeeStats(records) {
    const stats = {
      count: 0,
      totalHours: 0,
      totalFee: 0,
      regularHours: 0,
      regularFee: 0,
      retailHours: 0,
      retailFee: 0,
    };
    const list = Array.isArray(records) ? records : [];
    for (let i = 0; i < list.length; i++) {
      const rec = list[i];
      if (!rec) continue;
      const hours = Number(rec.classHours) || 0;
      const fee = Number(rec.classFee) || 0;
      stats.count += 1;
      stats.totalHours += hours;
      stats.totalFee += fee;
      if (rec.lessonType === 'retail') {
        stats.retailHours += hours;
        stats.retailFee += fee;
      } else {
        stats.regularHours += hours;
        stats.regularFee += fee;
      }
    }
    stats.totalHours = Math.round(stats.totalHours * 100) / 100;
    stats.totalFee = Math.round(stats.totalFee * 100) / 100;
    stats.regularHours = Math.round(stats.regularHours * 100) / 100;
    stats.regularFee = Math.round(stats.regularFee * 100) / 100;
    stats.retailHours = Math.round(stats.retailHours * 100) / 100;
    stats.retailFee = Math.round(stats.retailFee * 100) / 100;
    return stats;
  }

  async function saveExcelRows(fileName, sheetName, rows) {
    const ExcelJS = await getExcelJS();
    const saveAs = await getSaveAs();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName, { views: [{ showGridLines: true }] });
    const headerFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8EEF7' },
    };
    rows.forEach((row, idx) => {
      const excelRow = worksheet.addRow(row);
      if (idx === 0 || (row[0] && String(row[0]).includes('合计'))) {
        excelRow.eachCell((cell) => {
          cell.font = { bold: idx === 0 };
          if (idx === 0) cell.fill = headerFill;
        });
      }
    });
    worksheet.columns.forEach((col) => {
      col.width = 14;
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, fileName);
    return fileName;
  }

  async function exportMonthFeeExcel(records, ym) {
    if (!ym) throw new Error('请先选择月份');
    const list = Array.isArray(records) ? records : [];
    const inMonth = list.filter((r) => recordBelongsToMonth(r, ym));
    if (inMonth.length === 0) throw new Error('该月份没有任何上课记录');

    const sorted = sortRecordsByLessonDate(inMonth);
    const rows = [
      [`${ym} 课时费明细表`],
      [],
      [
        '上课日期',
        '课程类型',
        '课程名',
        '班级或时间段',
        '课时',
        '人数',
        '单价(元)',
        '课时费(元)',
        '教师',
      ],
    ];

    for (let i = 0; i < sorted.length; i++) {
      const rec = sorted[i];
      const iso = getRecordIsoDate(rec) || safeLessonDateFolderName(rec);
      const isRetail = rec.lessonType === 'retail';
      rows.push([
        iso,
        isRetail ? '零售课' : '常规课',
        rec.course || '',
        rec.lessonSchedule || '',
        rec.classHours != null ? rec.classHours : 0,
        isRetail ? getRetailHeadCount(rec) : '',
        rec.feeRate != null ? rec.feeRate : 0,
        rec.classFee != null ? rec.classFee : 0,
        rec.teacher || '',
      ]);
    }

    const stats = aggregateFeeStats(inMonth);
    rows.push([]);
    rows.push([
      '合计',
      `${stats.count} 节课`,
      '',
      '',
      stats.totalHours,
      '',
      '',
      stats.totalFee,
      '',
    ]);
    rows.push([
      '其中常规课',
      '',
      '',
      '',
      stats.regularHours,
      '',
      '',
      stats.regularFee,
      '',
    ]);
    rows.push([
      '其中零售课',
      '',
      '',
      '',
      stats.retailHours,
      '',
      '',
      stats.retailFee,
      '',
    ]);

    const fileName = `课时费明细_${ym}.xlsx`;
    await saveExcelRows(fileName, '月明细', rows);
    return fileName;
  }

  async function exportYearFeeExcel(records, year) {
    const y = String(year || '').trim();
    if (!/^\d{4}$/.test(y)) throw new Error('请填写有效年份，如 2026');

    const list = Array.isArray(records) ? records : [];
    const inYear = list.filter((r) => recordBelongsToYear(r, y));
    if (inYear.length === 0) throw new Error(`${y} 年没有任何上课记录`);

    const rows = [[`${y} 年课时费汇总表`], [], ['月份', '课次', '总课时', '常规课时费(元)', '零售课时费(元)', '合计课时费(元)']];

    const yearStats = aggregateFeeStats(inYear);

    for (let m = 1; m <= 12; m++) {
      const ym = `${y}-${pad2(m)}`;
      const inMonth = inYear.filter((r) => recordBelongsToMonth(r, ym));
      if (!inMonth.length) {
        rows.push([`${m}月`, 0, 0, 0, 0, 0]);
        continue;
      }
      const st = aggregateFeeStats(inMonth);
      rows.push([`${m}月`, st.count, st.totalHours, st.regularFee, st.retailFee, st.totalFee]);
    }

    rows.push([]);
    rows.push([
      '全年合计',
      yearStats.count,
      yearStats.totalHours,
      yearStats.regularFee,
      yearStats.retailFee,
      yearStats.totalFee,
    ]);

    const fileName = `课时费汇总_${y}年.xlsx`;
    await saveExcelRows(fileName, '年汇总', rows);
    return fileName;
  }

  function uniquifyFileNameInFolder(pool, stem, ext) {
    let fname = `${stem}.${ext}`;
    let n = 2;
    while (pool[fname]) {
      fname = `${stem}_${n}.${ext}`;
      n++;
    }
    pool[fname] = true;
    return fname;
  }

  async function exportMonthZip(records, ym) {
    if (!ym) throw new Error('请先选择要导出的月份');
    const list = Array.isArray(records) ? records : [];
    const inMonth = list.filter((r) => recordBelongsToMonth(r, ym));
    if (inMonth.length === 0) {
      throw new Error('该月份没有任何上课记录');
    }

    const withImage = inMonth.filter((r) => typeof r.imageBase64 === 'string' && r.imageBase64.length > 0);

    if (withImage.length === 0) {
      const retailInMonth = inMonth.filter((r) => r.lessonType === 'retail').length;
      if (retailInMonth > 0) {
        throw new Error('该月零售课记录缺少图片，请编辑补传照片后再导出');
      }
      throw new Error('该月份没有可导出的图片记录（或未带图）');
    }

    const JSZip = await getJSZip();
    const saveAs = await getSaveAs();
    const zip = new JSZip();
    zip.file(`上课记录汇总_${ym}.csv`, buildMonthExportSummaryCsv(inMonth));

    const classFolderCache = {};
    const leafFolders = {};
    const perFolderPools = {};
    let added = 0;

    for (let i = 0; i < withImage.length; i++) {
      const rec = withImage[i];
      const parsed = parseDataUrlForZip(rec.imageBase64);
      if (!parsed) continue;

      const classFolderName = buildExportClassFolderName(rec);
      const dateSafe = safeLessonDateFolderName(rec);

      const leafKey = `${classFolderName}/${dateSafe}`;

      if (!classFolderCache[classFolderName]) {
        classFolderCache[classFolderName] = zip.folder(classFolderName);
      }
      if (!leafFolders[leafKey]) {
        leafFolders[leafKey] = classFolderCache[classFolderName].folder(dateSafe);
        perFolderPools[leafKey] = {};
      }

      const fld = leafFolders[leafKey];
      const pool = perFolderPools[leafKey];
      const stem = buildLessonDateImageStem(rec);
      const fname = uniquifyFileNameInFolder(pool, stem, parsed.ext);
      fld.file(fname, parsed.base64, { base64: true });
      added++;
    }

    if (added === 0) {
      throw new Error('该月图片数据无法解析，请重新保存记录后再试');
    }

    const retailWithImage = withImage.filter((r) => r.lessonType === 'retail').length;
    const retailInMonth = inMonth.filter((r) => r.lessonType === 'retail').length;
    if (retailInMonth > 0 && retailWithImage === 0) {
      throw new Error('该月零售课记录均无法导出图片，请重新保存后再试');
    }

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const fileTitle = `上课记录导出_${ym}.zip`;
    saveAs(blob, fileTitle);
    return fileTitle;
  }

  /* ───── 积分表导出 ───── */

  async function exportPointsTableExcel(records, yearMonth, teacherName, categoryMap, nonTeachingItems, schoolMap) {
    if (!yearMonth) throw new Error('请先选择月份');

    const list = Array.isArray(records) ? records : [];
    const inMonth = list.filter((r) => recordBelongsToMonth(r, yearMonth));
    if (inMonth.length === 0) throw new Error('该月份没有任何记录');

    const name = String(teacherName || '').trim() || '未填写';
    const catMap = categoryMap && typeof categoryMap === 'object' ? categoryMap : {};
    const schMap = schoolMap && typeof schoolMap === 'object' ? schoolMap : {};
    const nonTeach = Array.isArray(nonTeachingItems) ? nonTeachingItems : [];
    const monthDisplay = `${parseInt(yearMonth.split('-')[1], 10)}月`;

    /* ── 聚合按类别分组 ── */
    const schoolGroups = {};
    const retailGroups = {};
    const trialGroups = {};

    for (let ri = 0; ri < inMonth.length; ri++) {
      const rec = inMonth[ri];
      if (!rec) continue;
      const course = rec.course || '';
      const isRetail = rec.lessonType === 'retail';
      const isTrial = !isRetail && catMap[course] === 'trial';

      if (isRetail) {
        const className = rec.lessonSchedule || '未填时间段';
        const hc = Math.max(
          1,
          rec.headCount > 0
            ? rec.headCount
            : Array.isArray(rec.students)
              ? rec.students.length
              : 1,
        );
        const key = className;
        if (!retailGroups[key]) {
          retailGroups[key] = { className, headCount: hc, singleHours: rec.classHours || 0, count: 0, totalHours: 0 };
        }
        const g = retailGroups[key];
        g.count += 1;
        g.totalHours = Number((g.totalHours + (rec.classHours || 0)).toFixed(2));
      } else if (isTrial) {
        const key = course || '未填课程';
        if (!trialGroups[key]) trialGroups[key] = { course: key, count: 0 };
        trialGroups[key].count += 1;
      } else {
        const schoolName =
          schMap[rec.lessonSchedule] || rec.lessonSchedule || '未填学校';
        const key = `${schoolName}||${rec.classHours || 0}`;
        if (!schoolGroups[key]) {
          schoolGroups[key] = { school: schoolName, singleHours: rec.classHours || 0, count: 0, totalHours: 0 };
        }
        const g = schoolGroups[key];
        g.count += 1;
        g.totalHours = Number((g.totalHours + (rec.classHours || 0)).toFixed(2));
      }
    }

    const schoolItems = Object.values(schoolGroups).map((g) => ({
      ...g,
      scorePerHour: 1,
      totalScore: Number((g.totalHours * 1).toFixed(2)),
    }));
    const retailItems = Object.values(retailGroups).map((g) => ({
      ...g,
      scorePerPersonPerHour: 0.3,
      totalScore: Number((g.totalHours * g.headCount * 0.3).toFixed(2)),
    }));
    const trialItems = Object.values(trialGroups).map((g) => ({
      ...g,
      scorePerPersonPerHour: 0.6,
      totalScore: Number((g.count * 0.6).toFixed(2)),
    }));

    /* ── 构建数据行 ── */
    const dataRows = [];

    for (let i = 0; i < schoolItems.length; i++) {
      const it = schoolItems[i];
      dataRows.push([
        monthDisplay, name,
        it.school, it.singleHours, it.count, it.totalHours, 1, it.totalScore,
        '', '', '', '', '', '', '',
        '', '', '', '',
        it.totalScore,
        '', '',
        '',
      ]);
    }
    for (let i = 0; i < retailItems.length; i++) {
      const it = retailItems[i];
      dataRows.push([
        monthDisplay, name,
        '', '', '', '', '', '',
        it.className, it.headCount, it.singleHours, it.count, it.totalHours, 0.3, it.totalScore,
        '', '', '',
        it.totalScore,
        '', '',
        '',
      ]);
    }
    for (let i = 0; i < trialItems.length; i++) {
      const it = trialItems[i];
      dataRows.push([
        monthDisplay, name,
        '', '', '', '', '', '',
        '', '', '', '', '', '', '',
        it.course, it.count, 0.6, it.totalScore,
        it.totalScore,
        '', '',
        '',
      ]);
    }

    /* ── 汇总行 ── */
    const sumSchool = schoolItems.reduce((s, it) => s + it.totalScore, 0);
    const sumRetail = retailItems.reduce((s, it) => s + it.totalScore, 0);
    const sumTrial = trialItems.reduce((s, it) => s + it.totalScore, 0);
    const sumNonTeaching = nonTeach.reduce((s, it) => s + Math.max(0, Number(it.hours) || 0) * 1, 0);
    const grandTeachingScore = Number((sumSchool + sumRetail + sumTrial).toFixed(2));
    const grandNonTeachingScore = Number(sumNonTeaching.toFixed(2));

    dataRows.push(Array(23).fill('')); // 空行

    // 合计行：教学部分
    dataRows.push([
      '合计', '',
      '', '', '', `校内:${sumSchool.toFixed(1)}`, '', sumSchool || '',
      '', '', '', `零售:${sumRetail.toFixed(1)}`, '', '', sumRetail || '',
      '', '', '', sumTrial || '',
      grandTeachingScore,
      '', '',
      '',
    ]);

    /* ── 非教工作 ── */
    if (nonTeach.length > 0) {
      dataRows.push(Array(23).fill(''));
      for (let i = 0; i < nonTeach.length; i++) {
        const it = nonTeach[i];
        const hrs = Math.max(0, Number(it.hours) || 0);
        const score = Number((hrs * 1).toFixed(2));
        dataRows.push([
          '', '',
          '', '', '', '', '', '',
          '', '', '', '', '', '', '',
          '', '', '', '',
          '',
          it.content || '', score,
          score,
        ]);
      }
      // 非教小计行
      dataRows.push([
        '非教合计', '',
        '', '', '', '', '', '',
        '', '', '', '', '', '', '',
        '', '', '', '',
        '',
        '', grandNonTeachingScore,
        grandNonTeachingScore,
      ]);
    }

    // 最终合计（教学 + 非教）
    const finalTotal = grandTeachingScore + grandNonTeachingScore;
    dataRows.push([
      `总积分:${finalTotal.toFixed(1)}`, '',
      '', '', '', '', '', '',
      '', '', '', '', '', '', '',
      '', '', '', '',
      finalTotal,
      '', '',
      '',
    ]);

    /* ── 生成 Excel ── */
    const ExcelJS = await getExcelJS();
    const saveAs = await getSaveAs();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('积分表', { views: [{ showGridLines: false }] });

    worksheet.columns = [
      { width: 6 },  // A: 月份
      { width: 8 },  // B: 姓名
      { width: 24 }, // C: 学校
      { width: 10 }, // D: 单次课时
      { width: 8 },  // E: 月次数
      { width: 10 }, // F: 合计课时
      { width: 12 }, // G: 计分/每小时
      { width: 10 }, // H: 合计计分
      { width: 28 }, // I: 班次
      { width: 10 }, // J: 上课人数
      { width: 8 },  // K: 小时
      { width: 8 },  // L: 月次数
      { width: 10 }, // M: 合计课时
      { width: 14 }, // N: 计分/人/小时
      { width: 10 }, // O: 合计计分
      { width: 16 }, // P: 课程
      { width: 10 }, // Q: 试听人次
      { width: 14 }, // R: 计分/人/小时
      { width: 10 }, // S: 合计计分
      { width: 10 }, // T: 总积分
      { width: 20 }, // U: 内容
      { width: 8 },  // V: 计分
      { width: 10 }, // W: 非教合计
    ];

    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    const fontHeader = { name: '等线', size: 11, bold: true };
    const fontDefault = { name: '宋体', size: 10 };
    const alignCenter = { vertical: 'middle', horizontal: 'center', wrapText: true };
    const alignLeft = { vertical: 'middle', horizontal: 'left', wrapText: true };
    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
    const boldFont = { name: '宋体', size: 10, bold: true };

    /* Row 1: 主表头 */
    const r1 = worksheet.addRow([
      '月份', '姓名',
      '校内课（1/小时，助教0.2/小时）', null, null, null, null, null,
      '零售课（0.3人/小时，一对一3倍课时人数为3，一对一1倍课时按0.5/h计分）', null, null, null, null, null, null,
      '试听（0.6人/次）', null, null, null,
      '总积分',
      '非教工作（1分/小时）', null,
      '非教合计',
    ]);
    r1.height = 50;
    for (let c = 1; c <= 23; c++) {
      const cell = r1.getCell(c);
      cell.font = fontHeader;
      cell.fill = headerFill;
      cell.alignment = alignCenter;
      cell.border = thinBorder;
    }

    /* Row 2: 子表头 */
    const r2 = worksheet.addRow([
      null, null,
      '学校', '单次课时', '月次数', '合计课时', '计分/每小时', '合计计分',
      '班次', '上课人数', '小时', '月次数', '合计课时', '计分/人/小时', '合计计分',
      '课程', '试听人次', '计分/人/小时', '合计计分',
      null,
      '内容', '计分',
      null,
    ]);
    r2.height = 24;
    for (let c = 1; c <= 23; c++) {
      const cell = r2.getCell(c);
      cell.font = fontHeader;
      cell.fill = headerFill;
      cell.alignment = alignCenter;
      cell.border = thinBorder;
    }

    /* 合并表头单元格 */
    worksheet.mergeCells('A1:A2');
    worksheet.mergeCells('B1:B2');
    worksheet.mergeCells('C1:H1');
    worksheet.mergeCells('I1:O1');
    worksheet.mergeCells('P1:S1');
    worksheet.mergeCells('T1:T2');
    worksheet.mergeCells('U1:V1');
    worksheet.mergeCells('W1:W2');

    /* 数据行 */
    const dataStartRow = 3;
    let excelRowIdx = dataStartRow;

    for (let i = 0; i < dataRows.length; i++) {
      const rowValues = dataRows[i];
      const allEmpty = rowValues.every((v) => v === '' || v === null || v === undefined);
      if (allEmpty) {
        excelRowIdx++;
        continue;
      }
      const excelRow = worksheet.addRow(rowValues);
      const isTotalRow = rowValues[0] === '合计';

      for (let c = 1; c <= rowValues.length; c++) {
        const cell = excelRow.getCell(c);
        cell.font = isTotalRow ? boldFont : fontDefault;
        cell.alignment = alignCenter;
        cell.border = thinBorder;
      }
      // 内容(U列) 左对齐
      excelRow.getCell(21).alignment = alignLeft;

      // 数字格式
      for (const ci of [4, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 22, 23]) {
        const v = excelRow.getCell(ci).value;
        if (typeof v === 'number') {
          excelRow.getCell(ci).numFmt = '0.0##';
        }
      }

      excelRow.height = 22;
      excelRowIdx++;
    }

    /* 合并 A & B 列数据区域 */
    const lastDataRow = excelRowIdx - 1;
    if (lastDataRow >= dataStartRow + 1) {
      worksheet.mergeCells(`A${dataStartRow}:A${lastDataRow}`);
      worksheet.mergeCells(`B${dataStartRow}:B${lastDataRow}`);
    }

    const fileName = `积分表_${yearMonth}_${name}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, fileName);
    return fileName;
  }

  return {
    sanitizeExcelFileNamePart,
    buildFeedbackExcelFilename,
    buildFeedbackExcelData,
    exportFeedbackExcel,
    safeFolderName,
    safeTimeSlotSegmentName,
    safeLessonDateFolderName,
    buildLessonDateImageStem,
    recordBelongsToMonth,
    uniquifyFileNameInFolder,
    exportMonthZip,
    exportMonthFeeExcel,
    exportYearFeeExcel,
    exportPointsTableExcel,
  };
}
