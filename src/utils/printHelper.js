import { Capacitor, registerPlugin } from '@capacitor/core';

// Register custom native Android NativePrint plugin
export const NativePrint = registerPlugin('NativePrint');

// Polyfill window.print on native Android so any direct window.print() call automatically routes to NativePrint
if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
  try {
    window.print = () => {
      NativePrint.print({ name: document.title || 'Tour2026_Document' }).catch((err) => {
        console.warn('Native print invocation failed:', err);
      });
    };
  } catch (err) {
    console.warn('Failed to polyfill window.print:', err);
  }
}

/**
 * Extracts and packages an element's HTML with full page styles and standalone print typography
 * into a self-contained printable HTML document.
 * Eliminates background app DOM, flex containers, and modal backdrops that cause blank pages in print previews.
 *
 * @param {Object} options
 * @param {string} [options.title]
 * @param {string} options.elementId
 * @returns {string}
 */
export function buildPrintableHtmlDocument({ title = 'Tour 2026 Document', elementId }) {
  if (typeof document === 'undefined') return '';
  const el = document.getElementById(elementId);
  if (!el) return '';

  // Gather existing page styles and CSS links
  let externalStyles = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((s) => {
    externalStyles += s.outerHTML + '\n';
  });

  const embeddedPrintStyles = `
    <style>
      *, *::before, *::after {
        box-sizing: border-box;
      }
      @page {
        margin: 10mm 12mm;
        size: auto;
      }
      html, body {
        background: #ffffff !important;
        color: #0f172a !important;
        margin: 0 !important;
        padding: 16px !important;
        font-family: 'Hind Siliguri', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif !important;
        font-size: 13px;
        line-height: 1.5;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .print\\:hidden, button:not(#print-allowed) {
        display: none !important;
      }
      table {
        width: 100% !important;
        border-collapse: collapse !important;
        margin-top: 8px;
        margin-bottom: 12px;
        font-size: 11px;
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid !important;
        page-break-after: auto !important;
      }
      thead {
        display: table-header-group !important;
      }
      th, td {
        border: 1px solid #cbd5e1 !important;
        padding: 6px 8px !important;
      }
      th {
        background-color: #f1f5f9 !important;
        color: #1e293b !important;
        font-weight: bold;
      }
      .break-inside-avoid, [data-page-break-avoid] {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      img {
        max-width: 100%;
        height: auto;
      }
    </style>
  `;

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${externalStyles}
  ${embeddedPrintStyles}
</head>
<body class="bg-white text-slate-900">
  ${el.innerHTML}
</body>
</html>`;
}

/**
 * Initiates a document print / PDF generation action across both Web and Android native.
 * On Android native, it triggers the Android System Print Spooler (offering "Save as PDF" and physical printers).
 * On Web, it invokes the browser's native print preview dialog.
 *
 * @param {Object} options
 * @param {string} [options.name] - Descriptive job / document name for the PDF
 * @param {string} [options.html] - Standalone HTML string to render in an isolated print view
 * @param {string} [options.elementId] - Element ID to automatically package into standalone HTML
 * @returns {Promise<boolean>}
 */
export async function printDocument({ name = 'Tour2026_Document', html = null, elementId = null } = {}) {
  let docHtml = html;
  if (!docHtml && elementId) {
    docHtml = buildPrintableHtmlDocument({ title: name, elementId });
  }

  if (Capacitor.isNativePlatform()) {
    try {
      await NativePrint.print({ name, html: docHtml });
      return true;
    } catch (err) {
      console.warn('NativePrint failed, falling back to window.print:', err);
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
        return true;
      }
      return false;
    }
  }

  // Web Browser environment
  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print();
    return true;
  }
  return false;
}

/**
 * Downloads or shares a text/CSV/HTML document across both Web and Android native.
 * On Android native, it writes the file and opens Android's native share/open chooser
 * (enabling instant opening in Google Sheets, Microsoft Excel, Drive, or saving to Downloads).
 * On Web, it triggers a clean browser file download via Blob.
 *
 * @param {Object} options
 * @param {string} options.fileName - e.g. 'CoxsBazar_Tour2026_Complete_Audit.csv'
 * @param {string} options.content - File text content (UTF-8)
 * @param {string} [options.mimeType] - e.g. 'text/csv' or 'text/html'
 * @returns {Promise<boolean>}
 */
export async function downloadOrShareTextFile({ fileName, content, mimeType = 'text/plain' }) {
  if (!content) return false;

  if (Capacitor.isNativePlatform()) {
    try {
      await NativePrint.shareOrSaveFile({ fileName, content, mimeType });
      return true;
    } catch (err) {
      console.warn('Native shareOrSaveFile failed, attempting Web blob fallback:', err);
    }
  }

  // Web browser fallback
  try {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (err) {
    console.error('Failed to download file on Web:', err);
    return false;
  }
}
