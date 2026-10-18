import { Capacitor } from '@capacitor/core';

export const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB chunks (well below Cloudflare 100MB body limit)

export function getUploadApiUrl() {
  return Capacitor.isNativePlatform()
    ? 'https://tour2026.izhaanintellect.fun/api/upload'
    : '/api/upload';
}

/**
 * Uploads a video file or blob in chunks with real-time progress callbacks.
 * Supports resume-safe chunking, automatic retries per chunk, and handles
 * large phone camera files without hitting Cloudflare body limits.
 *
 * @param {Blob|File} file - The video file or blob to upload
 * @param {Object} options
 * @param {string} options.postId - Post identifier
 * @param {string} [options.fileName] - Original file name
 * @param {function} [options.onProgress] - Callback: ({ percent, stage, loadedBytes, totalBytes, chunkIndex, totalChunks })
 * @param {number} [options.chunkSize] - Size of each chunk in bytes (default 8MB)
 * @returns {Promise<{ url: string, fileName: string, compressed: boolean, originalSize: number, compressedSize: number }>}
 */
export async function uploadReelVideo(file, { postId, fileName, onProgress, chunkSize = CHUNK_SIZE } = {}) {
  if (!file) throw new Error('No video file provided for upload');

  const totalSize = file.size;
  const resolvedFileName = fileName || file.name || `reel_${postId || Date.now()}.mp4`;
  const uploadApiUrl = getUploadApiUrl();

  // If file is 5MB or less, upload in 1 request without chunking overhead
  if (totalSize <= 5 * 1024 * 1024) {
    onProgress?.({ percent: 5, stage: 'uploading', loadedBytes: 0, totalBytes: totalSize, chunkIndex: 1, totalChunks: 1 });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadApiUrl);
      xhr.setRequestHeader('X-File-Name', encodeURIComponent(resolvedFileName));
      if (postId) xhr.setRequestHeader('X-Post-Id', encodeURIComponent(postId));

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.min(95, Math.round((e.loaded / e.total) * 90));
          onProgress?.({
            percent: pct,
            stage: pct >= 90 ? 'processing' : 'uploading',
            loadedBytes: e.loaded,
            totalBytes: e.total,
            chunkIndex: 1,
            totalChunks: 1,
          });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            onProgress?.({ percent: 100, stage: 'done', loadedBytes: totalSize, totalBytes: totalSize, chunkIndex: 1, totalChunks: 1 });
            resolve(data);
          } catch (err) {
            reject(new Error('Invalid server response: ' + err.message));
          }
        } else {
          reject(new Error(`Server error (${xhr.status}): ${xhr.responseText || xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during video upload'));
      xhr.send(file);
    });
  }

  // Chunked upload for larger files
  const totalChunks = Math.ceil(totalSize / chunkSize);
  const uploadId = `up_${postId || Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  let uploadedBytes = 0;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, totalSize);
    const chunkBlob = file.slice(start, end);
    const isFinalChunk = chunkIndex === totalChunks - 1;

    let attempts = 0;
    let chunkSuccess = false;
    let lastError = null;

    while (attempts < 3 && !chunkSuccess) {
      attempts++;
      try {
        const chunkResult = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', uploadApiUrl);
          xhr.setRequestHeader('X-Upload-Id', encodeURIComponent(uploadId));
          xhr.setRequestHeader('X-Chunk-Index', String(chunkIndex));
          xhr.setRequestHeader('X-Total-Chunks', String(totalChunks));
          xhr.setRequestHeader('X-File-Name', encodeURIComponent(resolvedFileName));
          if (postId) xhr.setRequestHeader('X-Post-Id', encodeURIComponent(postId));

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const currentChunkLoaded = e.loaded;
              const overallLoaded = uploadedBytes + currentChunkLoaded;
              // Reserve 95-100% for server compression
              const pct = Math.min(95, Math.round((overallLoaded / totalSize) * 95));
              onProgress?.({
                percent: pct,
                stage: isFinalChunk && pct >= 95 ? 'processing' : 'uploading',
                loadedBytes: overallLoaded,
                totalBytes: totalSize,
                chunkIndex: chunkIndex + 1,
                totalChunks,
              });
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve(data);
              } catch (err) {
                reject(new Error('Invalid JSON: ' + err.message));
              }
            } else {
              reject(new Error(`Server error (${xhr.status}): ${xhr.responseText || xhr.statusText}`));
            }
          };

          xhr.onerror = () => reject(new Error(`Network error on chunk ${chunkIndex + 1}`));
          xhr.send(chunkBlob);
        });

        uploadedBytes += (end - start);
        chunkSuccess = true;

        if (isFinalChunk) {
          onProgress?.({ percent: 100, stage: 'done', loadedBytes: totalSize, totalBytes: totalSize, chunkIndex: totalChunks, totalChunks });
          return chunkResult;
        }
      } catch (err) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 1000 * attempts));
      }
    }

    if (!chunkSuccess) {
      throw lastError || new Error(`Failed to upload chunk ${chunkIndex + 1} of ${totalChunks}`);
    }
  }
}
