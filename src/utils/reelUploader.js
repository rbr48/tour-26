import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { auth } from '../firebase';
import { dataUrlToBlob } from '../services/googleDriveService';
import {
  saveCheckpoint,
  getCheckpoint,
  markChunkUploaded,
  removeCheckpoint,
} from './mediaUploadCheckpoint';

export const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB chunks (well below Cloudflare 100MB body limit)

export function getUploadApiUrl() {
  return Capacitor.isNativePlatform()
    ? 'https://tour2026.izhaanintellect.fun/api/upload'
    : '/api/upload';
}

/**
 * Retrieves a valid Firebase Auth token, optionally forcing a refresh.
 */
export async function getAuthToken(forceRefresh = false) {
  const user = auth?.currentUser;
  let token = null;

  if (user) {
    try {
      token = await user.getIdToken(forceRefresh);
    } catch (err) {
      console.warn('Could not retrieve token from auth.currentUser:', err);
    }
  }

  if (!token && Capacitor.isNativePlatform()) {
    try {
      const res = await FirebaseAuthentication.getIdToken();
      token = res?.token || null;
    } catch (nativeErr) {
      console.warn('Could not retrieve token from native FirebaseAuthentication:', nativeErr);
    }
  }

  return token;
}

/**
 * Queries the server to check which chunks have already landed in the upload directory.
 */
async function queryServerChunks(uploadApiUrl, uploadId, token) {
  try {
    const url = `${uploadApiUrl}?uploadId=${encodeURIComponent(uploadId)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.chunks)) {
        return new Set(data.chunks);
      }
    }
  } catch (err) {
    console.warn('Failed to query existing chunks on server:', err);
  }
  return new Set();
}

/**
 * Uploads media (video, photo, blob) in chunks or single request with real-time progress,
 * resumable checkpoint storage in IndexedDB, auto-refresh for expired auth tokens (401),
 * and automatic retry with exponential backoff.
 *
 * @param {Blob|File|string} fileOrDataUrl - The file, blob or data URL to upload
 * @param {Object} options
 * @param {string} [options.postId] - Post identifier
 * @param {string} [options.uploadId] - Custom upload session identifier (for resuming)
 * @param {string} [options.fileName] - Original file name
 * @param {function} [options.onProgress] - Callback: ({ percent, stage, loadedBytes, totalBytes, chunkIndex, totalChunks })
 * @param {number} [options.chunkSize] - Size of each chunk in bytes (default 8MB)
 * @returns {Promise<{ url: string, fileName: string, type: string, size?: number, compressed?: boolean, originalSize?: number, compressedSize?: number }>}
 */
export async function uploadMedia(fileOrDataUrl, { postId, uploadId: customUploadId, fileName, onProgress, chunkSize = CHUNK_SIZE } = {}) {
  if (!fileOrDataUrl) throw new Error('No media file provided for upload');

  let file;
  if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
    file = await dataUrlToBlob(fileOrDataUrl);
  } else {
    file = fileOrDataUrl;
  }

  const isVideo = file.type?.includes('video') || /\.(mp4|mov|webm|m4v|mkv)$/i.test(fileName || file.name || '');
  const defaultExt = isVideo ? '.mp4' : (file.type?.includes('png') ? '.png' : '.jpg');
  const defaultPrefix = isVideo ? 'reel' : 'photo';
  const totalSize = file.size;
  const resolvedFileName = fileName || file.name || `${defaultPrefix}_${postId || Date.now()}${defaultExt}`;
  const uploadApiUrl = getUploadApiUrl();

  let token = await getAuthToken(false);

  // If file is 5MB or less, upload in 1 request without chunking overhead
  if (totalSize <= 5 * 1024 * 1024) {
    onProgress?.({ percent: 5, stage: 'uploading', loadedBytes: 0, totalBytes: totalSize, chunkIndex: 1, totalChunks: 1 });

    const performSingleUpload = (authToken) =>
      new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadApiUrl);
        xhr.timeout = 40000;
        if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
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
          if (xhr.status === 401) {
            reject({ isAuthError: true, status: 401 });
            return;
          }
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

        xhr.ontimeout = () => reject(new Error('Upload timed out. Retrying...'));
        xhr.onerror = () => reject(new Error('Network error during media upload'));
        xhr.send(file);
      });

    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      try {
        return await performSingleUpload(token);
      } catch (err) {
        if (err?.isAuthError) {
          console.warn('Received 401 on single upload. Refreshing token and retrying...');
          token = await getAuthToken(true);
          return await performSingleUpload(token);
        }
        if (attempts >= 3) throw err;
        console.warn(`Single upload attempt ${attempts} failed (${err?.message || 'network error'}), retrying in ${attempts * 1000}ms...`);
        await new Promise((r) => setTimeout(r, attempts * 1000));
      }
    }
  }

  // Chunked upload for larger files
  const totalChunks = Math.ceil(totalSize / chunkSize);
  const uploadId = customUploadId || `up_${postId || Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Restore existing checkpoint if present
  let localCheckpoint = await getCheckpoint(uploadId);
  if (!localCheckpoint) {
    localCheckpoint = {
      uploadId,
      postId,
      fileName: resolvedFileName,
      totalChunks,
      uploadedChunks: [],
      fileSize: totalSize,
      chunkSize,
      createdAt: Date.now(),
    };
    await saveCheckpoint(localCheckpoint);
  }

  // Check server for any chunks it already holds
  const serverChunks = await queryServerChunks(uploadApiUrl, uploadId, token);
  const knownUploaded = new Set([...(localCheckpoint.uploadedChunks || []), ...serverChunks]);

  let uploadedBytes = 0;
  for (let i = 0; i < totalChunks; i++) {
    if (knownUploaded.has(i) && i < totalChunks - 1) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, totalSize);
      uploadedBytes += (end - start);
    }
  }

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, totalSize);
    const chunkBlob = file.slice(start, end);
    const isFinalChunk = chunkIndex === totalChunks - 1;

    // Skip intermediate chunks that are already on the server
    if (knownUploaded.has(chunkIndex) && !isFinalChunk) {
      continue;
    }

    let attempts = 0;
    let chunkSuccess = false;
    let lastError = null;

    while (attempts < 4 && !chunkSuccess) {
      attempts++;
      try {
        const chunkResult = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', uploadApiUrl);
          xhr.timeout = 40000; // 40 seconds per chunk
          if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
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

          xhr.onload = async () => {
            if (xhr.status === 401) {
              // Token expired; mark for token refresh
              reject({ isAuthError: true, status: 401 });
              return;
            }
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

          xhr.ontimeout = () => reject(new Error(`Timeout on chunk ${chunkIndex + 1}`));
          xhr.onerror = () => reject(new Error(`Network error on chunk ${chunkIndex + 1}`));
          xhr.send(chunkBlob);
        });

        uploadedBytes += (end - start);
        knownUploaded.add(chunkIndex);
        chunkSuccess = true;

        // Persist checkpoint progress
        await markChunkUploaded(uploadId, chunkIndex);

        if (isFinalChunk) {
          onProgress?.({ percent: 100, stage: 'done', loadedBytes: totalSize, totalBytes: totalSize, chunkIndex: totalChunks, totalChunks });
          // Cleanup completed checkpoint
          await removeCheckpoint(uploadId);
          return chunkResult;
        }
      } catch (err) {
        lastError = err;
        if (err?.isAuthError) {
          console.warn('Received 401 during chunk upload, requesting fresh token...');
          token = await getAuthToken(true);
        } else {
          // Exponential backoff
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempts - 1)));
        }
      }
    }

    if (!chunkSuccess) {
      throw lastError || new Error(`Failed to upload chunk ${chunkIndex + 1} of ${totalChunks}`);
    }
  }
}

/** Backward compatibility alias */
export const uploadReelVideo = uploadMedia;
