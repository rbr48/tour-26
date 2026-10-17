// Spreadsheets run a cell that starts with = + - or @ as a formula. Text values get a
// leading apostrophe so they stay text; numbers are safe and are written as they are.
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  let text = value === null || value === undefined ? '' : String(value);
  if (FORMULA_START.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export function csvRow(values) {
  return values.map(csvCell).join(',');
}
