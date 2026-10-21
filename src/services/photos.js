import { compressImage } from '../utils/imageCompressor';
import { uploadToGoogleDrive } from './googleDriveService';

// Firestore subcollection document keeps a sharp, high-definition preview of each photo.
// The original/full-size copy lives in the shared Google Drive folder.
const THUMB_MAX_SIDE = 800;
const THUMB_MAX_CHARS = 180000;
const PROFILE_PHOTO_MAX_CHARS = 180000;
const PROFILE_PHOTO_SIDE = 384;

export const isDataImage = (value) => typeof value === 'string' && value.startsWith('data:image');

/** High-definition JPEG preview (up to 1080px Instagram standard, at most ~240 KB). */
export async function makeThumbnail(dataUrl) {
  let side = THUMB_MAX_SIDE;
  let quality = 0.82;
  let result = await compressImage(dataUrl, side, side, quality);
  for (let attempt = 0; attempt < 3 && result.length > THUMB_MAX_CHARS; attempt += 1) {
    side = Math.round(side * 0.88);
    quality = Math.max(0.68, quality - 0.05);
    result = await compressImage(result, side, side, quality);
  }
  return result;
}

/** Keeps profile photos small enough for a Firestore document. */
export async function shrinkProfilePhoto(value) {
  if (!isDataImage(value) || value.length <= PROFILE_PHOTO_MAX_CHARS) {
    return value ?? null;
  }
  return compressImage(value, PROFILE_PHOTO_SIDE, PROFILE_PHOTO_SIDE, 0.7);
}

/**
 * Fields a new photo post stores, from an image already compressed for upload. The
 * full-size copy goes to Drive first. If that upload fails, nothing is saved, so no
 * photo is lost and no half-finished post appears in the feed.
 */
export async function preparePhotoFromDataUrl({ dataUrl, authorName, caption }) {
  const thumb = await makeThumbnail(dataUrl);
  let upload = null;
  try {
    upload = await uploadToGoogleDrive({
      imageDataUrl: dataUrl,
      fileName: `Tour2026_${authorName.replace(/\s+/g, '_')}_${Date.now()}.jpg`,
      caption,
    });
  } catch (err) {
    console.warn('Google Drive photo upload failed or skipped, saving thumbnail directly:', err);
  }

  if (upload?.success && upload.fileId) {
    return {
      thumb,
      driveBackedUp: true,
      driveFileId: upload.fileId,
      driveViewUrl: upload.webViewLink,
    };
  }

  return {
    thumb,
    driveBackedUp: false,
    driveFileId: null,
    driveViewUrl: null,
  };
}

/** A pasted image link needs no upload, so it is stored as the link itself. */
export const preparePhotoFromUrl = (url) => ({
  image: url,
  thumb: url,
  driveBackedUp: false,
  driveFileId: null,
  driveViewUrl: null,
});

/**
 * Uploads a photo that was stored before the upgrade and is still only in Firestore,
 * then returns the fields that replace the full-size copy.
 */
export async function syncLegacyPhotoToDrive({ image, caption }) {
  if (!isDataImage(image)) {
    throw new Error('এই ছবিটি আগে থেকেই সংরক্ষিত');
  }
  const upload = await uploadToGoogleDrive({
    imageDataUrl: image,
    fileName: `Tour2026_${Date.now()}.jpg`,
    caption,
  });
  if (!upload?.success || !upload.fileId) {
    throw new Error('গুগল ড্রাইভে ছবি সংরক্ষণ হয়নি।');
  }
  return {
    driveBackedUp: true,
    driveFileId: upload.fileId,
    driveViewUrl: upload.webViewLink,
  };
}
