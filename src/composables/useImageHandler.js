export function useImageHandler() {
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = () => {
        reject(reader.error || new Error('读取图片失败'));
      };
      reader.readAsDataURL(file);
    });
  }

  function blobFromDataUrl(dataUrl) {
    return fetch(dataUrl).then((res) => res.blob());
  }

  function extFromDataUrl(dataUrl) {
    const m = typeof dataUrl === 'string' ? /^data:image\/([^;+]+)/i.exec(dataUrl) : null;
    if (!m) return 'jpg';
    const t = m[1].toLowerCase().split('+')[0];
    if (t === 'jpeg' || t === 'jpg') return 'jpg';
    if (t === 'png' || t === 'gif' || t === 'webp') return t;
    return 'jpg';
  }

  function parseDataUrlForZip(dataUrl) {
    if (typeof dataUrl !== 'string' || dataUrl.indexOf('base64,') === -1) return null;
    const comma = dataUrl.indexOf('base64,');
    const ext = extFromDataUrl(dataUrl);
    return { base64: dataUrl.slice(comma + 7), ext };
  }

  function compressImageFileForStorage(file) {
    if (!file) return Promise.resolve(null);
    const isImage = file.type && /^image\//i.test(file.type);
    if (!isImage) return Promise.resolve(file);
    if (file.size <= 450 * 1024) return Promise.resolve(file);
    if (typeof URL === 'undefined' || typeof Image === 'undefined') {
      return Promise.resolve(file);
    }

    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          if (!w || !h) {
            URL.revokeObjectURL(objectUrl);
            resolve(file);
            return;
          }
          const maxSide = 1600;
          const ratio = Math.min(1, maxSide / Math.max(w, h));
          const targetW = Math.max(1, Math.round(w * ratio));
          const targetH = Math.max(1, Math.round(h * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, targetW, targetH);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);
              if (!blob || blob.size === 0 || blob.size >= file.size) {
                resolve(file);
                return;
              }
              const baseName = (file.name || 'photo').replace(/\.[^.]+$/, '');
              const compressed = new File([blob], `${baseName}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressed);
            },
            'image/jpeg',
            0.82,
          );
        } catch (e) {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    });
  }

  return {
    readFileAsDataURL,
    blobFromDataUrl,
    extFromDataUrl,
    parseDataUrlForZip,
    compressImageFileForStorage,
  };
}
