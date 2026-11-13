export const MAX_REVIEW_IMAGES = 4;
const MAX_INPUT_BYTES = 8 * 1024 * 1024; // 8 MB per original file
const MAX_DIMENSION_PX = 960;

export function validateAndProcessReviewImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error(`الملف "${file.name}" ليس صورة صالحة. يرجى اختيار PNG أو JPG أو WebP.`));
      return;
    }

    if (file.size > MAX_INPUT_BYTES) {
      reject(new Error(`حجم الصورة "${file.name}" يتجاوز 8 ميجابايت.`));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      reject(new Error(`تعذر قراءة الصورة "${file.name}".`));
    };
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        reject(new Error('تعذر تحميل بيانات الصورة.'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
            const ratio = Math.min(MAX_DIMENSION_PX / width, MAX_DIMENSION_PX / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          resolve(compressed || dataUrl);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => {
        reject(new Error(`تعذر معالجة ملف الصورة "${file.name}".`));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
