// Client-side HTML5 Canvas Image Compression Utility
// Downscales high-resolution camera/mobile photos to lightweight web-optimized JPEG data URLs
// Prevents Firestore 1MB document limit exceed errors and speeds up app performance

export const compressImage = (dataUrl, maxWidth = 900, maxHeight = 900, quality = 0.7) => {
  return new Promise((resolve) => {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
      return resolve(dataUrl);
    }

    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate proportional constrained dimensions
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch (err) {
        console.warn('Canvas compression error, using original:', err);
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
};

// Compress a File object directly from <input type="file">
export const compressImageFile = (file, maxWidth = 900, maxHeight = 900, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image'));
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawDataUrl = e.target.result;
      const compressedDataUrl = await compressImage(rawDataUrl, maxWidth, maxHeight, quality);
      resolve(compressedDataUrl);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};
