import { compressImage } from '../utils/imageCompressor';
import { uploadToGoogleDrive } from './googleDriveService';

// Firestore subcollection document keeps a sharp, fast preview of each photo.
// The original/full-size copy lives on the VPS and the shared Google Drive folder.
const THUMB_MAX_SIDE = 1080;
const THUMB_MAX_CHARS = 140000;
const PROFILE_PHOTO_MAX_CHARS = 120000;
const PROFILE_PHOTO_SIDE = 384;

export const isDataImage = (value) => typeof value === 'string' && value.startsWith('data:image');

/** High-definition JPEG preview (up to 1080px mobile Full HD, ~80-100 KB). */
export async function makeThumbnail(dataUrl) {
  let side = THUMB_MAX_SIDE;
  let quality = 0.85;
  let result = await compressImage(dataUrl, side, side, quality);
  for (let attempt = 0; attempt < 3 && result.length > THUMB_MAX_CHARS; attempt += 1) {
    side = Math.round(side * 0.90);
    quality = Math.max(0.72, quality - 0.04);
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
 * full-size copy goes to Drive first. If that upload fails, nothing is lost and the
 * thumbnail preview is saved.
 */
export async function preparePhotoFromDataUrl({ dataUrl, authorName, caption }) {
  const thumb = await makeThumbnail(dataUrl);
  let upload = null;
  const safeAuthor = String(authorName || 'member').trim().replace(/\s+/g, '_') || 'member';
  try {
    upload = await uploadToGoogleDrive({
      imageDataUrl: dataUrl,
      fileName: `Tour2026_${safeAuthor}_${Date.now()}.jpg`,
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
