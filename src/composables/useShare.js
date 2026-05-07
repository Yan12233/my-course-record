import { useImageHandler } from './useImageHandler';

export function useShare() {
  const { blobFromDataUrl, extFromDataUrl } = useImageHandler();

  function safeLessonDateStem(rec) {
    let raw = rec && typeof rec.lessonDate === 'string' ? rec.lessonDate.trim() : '';
    if (!raw && rec && rec.datetime) {
      const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(rec.datetime || '').trim());
      raw = m ? m[1] : '';
    }
    if (!raw) return 'photo';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    let s = raw.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
    if (!s || s === '.' || s === '..') return 'photo';
    if (s.length > 80) s = `${s.slice(0, 78)}..`;
    return s;
  }

  function buildLessonReportText(courseRaw, lessonScheduleRaw) {
    const course = String(courseRaw || '').trim();
    const sch =
      lessonScheduleRaw && typeof lessonScheduleRaw === 'string' ? lessonScheduleRaw.trim() : '';
    if (!sch) return course || '未填班级';
    // 有课程名则放在班级名前面；未填课程名则仅保留班级名。
    if (!course) return sch;
    return `${course} ${sch}`.trim();
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  function copyPasteTextPromise(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text).then(
        () => true,
        () => Promise.resolve(fallbackCopy(text)),
      );
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function copyLessonReportToClipboard(text, imageDataUrl) {
    function textOnly(reason) {
      return copyPasteTextPromise(text).then((ok) => ({
        textOk: ok,
        combined: false,
        reason: reason || 'text-only',
      }));
    }

    if (!imageDataUrl) {
      return textOnly('no-image');
    }

    return blobFromDataUrl(imageDataUrl)
      .then((imgBlob) => {
        const mime = imgBlob.type && /^image\//i.test(imgBlob.type) ? imgBlob.type : 'image/png';

        if (
          !navigator.clipboard ||
          typeof navigator.clipboard.write !== 'function' ||
          typeof ClipboardItem === 'undefined'
        ) {
          return textOnly('clipboard-api');
        }

        const defs = {};
        defs['text/plain'] = Promise.resolve(new Blob([text], { type: 'text/plain;charset=utf-8' }));
        defs[mime] = Promise.resolve(imgBlob);

        let item;
        try {
          item = new ClipboardItem(defs);
        } catch (e1) {
          return textOnly('clipboard-item-fail');
        }

        return navigator.clipboard.write([item]).then(
          () => ({ textOk: true, combined: true }),
          () => textOnly('multi-type-failed'),
        );
      })
      .catch(() => textOnly('blob-read-failed'));
  }

  function navigatorShareLesson(title, text, rec, opts) {
    const options = opts || {};
    const tryTextWhenNoFiles = options.tryTextWhenNoFiles !== false;

    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
      return Promise.resolve({ outcome: 'not-supported' });
    }

    const dataUrl =
      rec && typeof rec.imageBase64 === 'string' && rec.imageBase64.length > 0 ? rec.imageBase64 : '';

    function shareTextOnly() {
      return navigator
        .share({ title, text })
        .then(() => ({ outcome: 'shared-text' }))
        .catch((err) => {
          if (err && err.name === 'AbortError') {
            return { outcome: 'aborted' };
          }
          return { outcome: 'error', error: err };
        });
    }

    if (!dataUrl) {
      return shareTextOnly();
    }

    return blobFromDataUrl(dataUrl)
      .then((blob) => {
        if (typeof File !== 'function') {
          return tryTextWhenNoFiles
            ? shareTextOnly()
            : Promise.resolve({ outcome: 'cannot-share-files' });
        }
        const ext = extFromDataUrl(dataUrl);
        const stem = safeLessonDateStem(rec);
        const safeName =
          String(stem)
            .replace(/[\\/:*?"<>|]/g, '_')
            .replace(/^\.+|\.+$/g, '')
            .trim()
            .slice(0, 80) || 'photo';
        const mime = blob.type && /^image\//i.test(blob.type) ? blob.type : 'image/jpeg';
        const imageFile = new File([blob], `${safeName}.${ext}`, {
          type: mime,
        });
        const payload = { title, text, files: [imageFile] };

        const canShareFiles =
          navigator.canShare && typeof navigator.canShare === 'function' && navigator.canShare(payload);

        if (!canShareFiles) {
          if (tryTextWhenNoFiles) {
            return shareTextOnly();
          }
          return Promise.resolve({ outcome: 'cannot-share-files' });
        }

        return navigator.share(payload).then(
          () => ({ outcome: 'shared-with-files' }),
          (err) => {
            if (err && err.name === 'AbortError') {
              return { outcome: 'aborted' };
            }
            if (tryTextWhenNoFiles) {
              return navigator
                .share({ title, text })
                .then(() => ({ outcome: 'shared-text' }))
                .catch((e2) => {
                  if (e2 && e2.name === 'AbortError') {
                    return { outcome: 'aborted' };
                  }
                  return { outcome: 'error', error: e2 };
                });
            }
            return { outcome: 'share-error', error: err };
          },
        );
      })
      .catch((err) => {
        if (tryTextWhenNoFiles) {
          return shareTextOnly();
        }
        return { outcome: 'error', error: err };
      });
  }

  function shareLessonRecordViaSystem(rec) {
    const text = buildLessonReportText(rec.course, rec.lessonSchedule);
    return navigatorShareLesson('上课记录', text, rec, {
      tryTextWhenNoFiles: true,
    }).then((r) => {
      if (!r) return { ok: false, reason: 'unknown' };
      if (r.outcome === 'aborted') return { ok: false, cancelled: true };
      if (r.outcome === 'shared-with-files') return { ok: true };
      if (r.outcome === 'shared-text') return { ok: true, textOnlyShared: true };
      if (r.outcome === 'not-supported') return { ok: false, reason: 'no-share-api' };
      return { ok: false, reason: 'share-failed' };
    });
  }

  function getRuntimeInteractionHint() {
    const proto =
      typeof location !== 'undefined' && location.protocol ? String(location.protocol).toLowerCase() : '';
    const ua =
      typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent.toLowerCase() : '';
    if (proto === 'file:') {
      return '当前为本地 file:// 打开，部分浏览器会限制剪贴板/唤起能力；建议用 localhost 或 HTTPS。';
    }
    if (/micromessenger/.test(ua)) {
      return '你当前在微信内打开页面，若长按图片复制受限，可先保存图片到相册再发送。';
    }
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      return '当前浏览器对自动复制支持有限；若失败请改为长按文字手动复制。';
    }
    return '若微信内无法直接粘贴图片，可先保存到相册后再发送。';
  }

  return {
    buildLessonReportText,
    fallbackCopy,
    copyPasteTextPromise,
    copyLessonReportToClipboard,
    navigatorShareLesson,
    shareLessonRecordViaSystem,
    getRuntimeInteractionHint,
  };
}
