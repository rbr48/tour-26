import { describe, expect, it } from 'vitest';
import { csvCell, csvRow } from './csv';

describe('csvCell', () => {
  it('quotes text and doubles embedded quotes', () => {
    expect(csvCell('বাস "এসি"')).toBe('"বাস ""এসি"""');
  });

  it('neutralises spreadsheet formulas in text', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell('+1-800')).toBe(`"'+1-800"`);
    expect(csvCell('-5 বার')).toBe(`"'-5 বার"`);
    expect(csvCell('@SUM(A1)')).toBe(`"'@SUM(A1)"`);
  });

  it('writes numbers as they are, including negatives', () => {
    expect(csvCell(1500)).toBe('1500');
    expect(csvCell(-250)).toBe('-250');
    expect(csvCell(0)).toBe('0');
  });

  it('writes empty values as empty cells', () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });
});

describe('csvRow', () => {
  it('joins cells into one row', () => {
    expect(csvRow(['খাত', 500, '=1+1'])).toBe(`"খাত",500,"'=1+1"`);
  });
});
