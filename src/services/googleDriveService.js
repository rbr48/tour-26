// Google Drive Integration Service for Tour 2026 App
// Folder: https://drive.google.com/drive/folders/1G_g7cTkA489hbL9dsF6LU5tdfX3E54vM?usp=sharing

export const GOOGLE_DRIVE_FOLDER_ID = '1G_g7cTkA489hbL9dsF6LU5tdfX3E54vM';
export const GOOGLE_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_FOLDER_ID}?usp=sharing`;

// 1. Get cached Google Drive Access Token
export const getDriveAccessToken = () => {
  try {
    return localStorage.getItem('tour_google_drive_token') || sessionStorage.getItem('tour_google_drive_token');
  } catch {
    return null;
  }
};

// 2. Save Google Drive Access Token
export const setDriveAccessToken = (token) => {
  try {
    if (token) {
      localStorage.setItem('tour_google_drive_token', token);
      sessionStorage.setItem('tour_google_drive_token', token);
    } else {
      localStorage.removeItem('tour_google_drive_token');
      sessionStorage.removeItem('tour_google_drive_token');
    }
  } catch (e) {
    console.warn('Failed to store drive token:', e);
  }
};

// 3. Convert Base64 / Data URL to Blob
export const dataUrlToBlob = async (dataUrl) => {
  if (dataUrl.startsWith('blob:')) {
    const res = await fetch(dataUrl);
    return await res.blob();
  }
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1] || 'image/jpeg';
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
};

// 4. Upload File to Google Drive via Drive REST API v3 Multipart Upload
export const uploadToGoogleDrive = async ({
  imageDataUrl,
  fileName,
  caption = '',
  folderId = GOOGLE_DRIVE_FOLDER_ID
}) => {
  // First check if Apps Script webhook URL is provided in settings
  const webhookUrl = getAppsScriptWebhook();
  if (webhookUrl) {
    try {
      const scriptRes = await uploadViaAppsScript(webhookUrl, {
        imageDataUrl,
        fileName,
        caption,
        author: 'ফ্যামিলি মেম্বার'
      });
      if (scriptRes?.success || scriptRes?.fileId) {
        return {
          success: true,
          fileId: scriptRes.fileId,
          fileName: scriptRes.fileName || fileName,
          webViewLink: scriptRes.webViewLink || `https://drive.google.com/file/d/${scriptRes.fileId}/view`,
          folderUrl: GOOGLE_DRIVE_FOLDER_URL
        };
      }
    } catch (whErr) {
      console.warn('Apps Script webhook failed, falling back to OAuth token:', whErr);
    }
  }

  const token = getDriveAccessToken();

  if (!token) {
    throw new Error('NO_TOKEN');
  }

  const blob = await dataUrlToBlob(imageDataUrl);
  const name = fileName || `Tour2026_${Date.now()}.jpg`;

  const makeUploadRequest = async (targetFolderId) => {
    const metadata = {
      name,
      description: caption ? `${caption} - রংপুর ➔ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬` : 'রংপুর ➔ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬ ফটো ব্যাকআপ',
      mimeType: blob.type || 'image/jpeg'
    };

    if (targetFolderId) {
      metadata.parents = [targetFolderId];
    }

    const boundary = '-------tour2026_' + Math.random().toString(36).substring(2) + Date.now();
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const preContent =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${blob.type || 'image/jpeg'}\r\n\r\n`;

    const multipartBlob = new Blob([preContent, blob, closeDelim], {
      type: `multipart/related; boundary=${boundary}`
    });

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBlob
      }
    );

    return response;
  };

  let response = await makeUploadRequest(folderId);

  // If token is invalid/expired
  if (response.status === 401) {
    setDriveAccessToken(null);
    throw new Error('TOKEN_EXPIRED');
  }

  // If error is folder permission (e.g. 404 or 403 on parents), fallback to saving in user's root Drive
  if (!response.ok && (response.status === 404 || response.status === 403)) {
    console.warn(`Upload to folder ${folderId} returned ${response.status}, retrying to root drive...`);
    const fallbackResponse = await makeUploadRequest(null);
    if (fallbackResponse.ok) {
      const fallbackResult = await fallbackResponse.json();
      return {
        success: true,
        fileId: fallbackResult.id,
        fileName: fallbackResult.name,
        webViewLink: fallbackResult.webViewLink || `https://drive.google.com/file/d/${fallbackResult.id}/view`,
        folderUrl: GOOGLE_DRIVE_FOLDER_URL,
        fallbackRoot: true
      };
    }
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const message = errData?.error?.message || `Google Drive upload failed (${response.status})`;
    throw new Error(message);
  }

  const result = await response.json();
  return {
    success: true,
    fileId: result.id,
    fileName: result.name,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    folderUrl: GOOGLE_DRIVE_FOLDER_URL
  };
};

// 5. Apps Script Webhook configuration helper
export const getAppsScriptWebhook = () => {
  try {
    return localStorage.getItem('tour_drive_webhook_url') || '';
  } catch {
    return '';
  }
};

export const setAppsScriptWebhook = (url) => {
  try {
    if (url) {
      localStorage.setItem('tour_drive_webhook_url', url.trim());
    } else {
      localStorage.removeItem('tour_drive_webhook_url');
    }
  } catch (e) {
    console.warn('Failed to set webhook url:', e);
  }
};

// 6. Direct Upload Helper for Apps Script Webhook (zero-auth shared folder webhook)
export const uploadViaAppsScript = async (webhookUrl, { imageDataUrl, fileName, caption, author }) => {
  if (!webhookUrl) throw new Error('NO_WEBHOOK');

  const payload = {
    image: imageDataUrl,
    name: fileName || `Tour2026_${Date.now()}.jpg`,
    caption,
    author,
    folderId: GOOGLE_DRIVE_FOLDER_ID
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return await response.json();
};
