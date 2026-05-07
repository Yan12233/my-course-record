import { useImageHandler } from './useImageHandler';

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
      { width: 14 },
      { width: 28 },
      { width: 14 },
      { width: 36 },
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

    const row5 = worksheet.addRow(['本次课程\n授课内容', formData.courseContent, '', '']);
    worksheet.mergeCells(`B${row5.number}:D${row5.number}`);
    row5.height = 80;
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
      const singleRowHeight = Math.max(25, Math.ceil(textLen / 35) * 12);
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
      const tailRow = worksheet.addRow(['XXX', '', '', '']);
      worksheet.mergeCells(`B${tailRow.number}:D${tailRow.number}`);
      tailRow.height = 25;
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

  function safeTimeSlotSegmentName(scheduleRaw) {
    let s = scheduleRaw && typeof scheduleRaw === 'string' ? scheduleRaw.trim() : '';
    if (!s) return '未填写时间段';
    s = s.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
    if (!s || s === '.' || s === '..') return '未填写时间段';
    return s;
  }

  function deriveLessonDateFromDatetimeStr(dtStr) {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(dtStr || '').trim());
    return m ? m[1] : '';
  }

  function normalizeLessonDateIso(raw) {
    const s = String(raw || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
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

  function recordBelongsToMonth(record, yearMonth) {
    if (!record || !yearMonth) return false;
    const ld =
      record.lessonDate && typeof record.lessonDate === 'string' ? record.lessonDate.trim() : '';
    const iso = normalizeLessonDateIso(ld);
    if (iso) return iso.substring(0, 7) === yearMonth;
    const dt = record.datetime;
    if (typeof dt === 'string' && dt.length >= 7) return dt.substring(0, 7) === yearMonth;
    if (typeof record.createdAt === 'number' && !Number.isNaN(record.createdAt)) {
      const d = new Date(record.createdAt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}` === yearMonth;
    }
    return false;
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
    const withImage = inMonth.filter((r) => typeof r.imageBase64 === 'string' && r.imageBase64.length > 0);

    if (withImage.length === 0) {
      throw new Error('该月份没有可导出的图片记录（或未带图）');
    }

    const JSZip = await getJSZip();
    const saveAs = await getSaveAs();
    const zip = new JSZip();
    const classFolderCache = {};
    const leafFolders = {};
    const perFolderPools = {};
    const classCourseNotes = {};
    let added = 0;

    for (let i = 0; i < withImage.length; i++) {
      const rec = withImage[i];
      const parsed = parseDataUrlForZip(rec.imageBase64);
      if (!parsed) continue;

      const classSafe = safeTimeSlotSegmentName(rec.lessonSchedule);
      const dateSafe = safeLessonDateFolderName(rec);
      const courseText = String(rec.course || '').trim() || '未填写课程';

      const leafKey = `${classSafe}/${dateSafe}`;

      if (!classFolderCache[classSafe]) {
        classFolderCache[classSafe] = zip.folder(classSafe);
        classCourseNotes[classSafe] = {};
      }
      if (!leafFolders[leafKey]) {
        leafFolders[leafKey] = classFolderCache[classSafe].folder(dateSafe);
        perFolderPools[leafKey] = {};
      }
      classCourseNotes[classSafe][courseText] = true;

      const fld = leafFolders[leafKey];
      const pool = perFolderPools[leafKey];
      const stem = buildLessonDateImageStem(rec);
      const fname = uniquifyFileNameInFolder(pool, stem, parsed.ext);
      fld.file(fname, parsed.base64, { base64: true });
      added++;
    }

    Object.keys(classFolderCache).forEach((className) => {
      const courseList = Object.keys(classCourseNotes[className] || {}).sort((a, b) =>
        a.localeCompare(b, 'zh-Hans-CN')
      );
      const noteContent = [
        `班级：${className}`,
        '课程备注：',
        ...(courseList.length > 0 ? courseList.map((c) => `- ${c}`) : ['- 未填写课程']),
      ].join('\n');
      classFolderCache[className].file('课程备注.txt', noteContent);
    });

    if (added === 0) {
      throw new Error('该月图片数据无法解析，请重新保存记录后再试');
    }

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const fileTitle = `上课记录导出_${ym}.zip`;
    saveAs(blob, fileTitle);
    return fileTitle;
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
  };
}
