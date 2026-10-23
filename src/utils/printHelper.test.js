import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printDocument, downloadOrShareTextFile, buildPrintableHtmlDocument } from './printHelper';

describe('printHelper', () => {
  beforeEach(() => {
    global.window = {
      print: vi.fn(),
    };
    global.document = {
      title: 'Tour 2026',
      createElement: vi.fn(() => ({
        click: vi.fn(),
        href: '',
        download: '',
      })),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
      getElementById: vi.fn((id) => {
        if (id === 'report-test') {
          return { innerHTML: '<h1>হিসাব বিবরণী</h1>' };
        }
        return null;
      }),
      querySelectorAll: vi.fn(() => []),
    };
    global.URL = {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    };
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    vi.restoreAllMocks();
  });

  describe('printDocument', () => {
    it('calls window.print in web environment', async () => {
      const res = await printDocument({ name: 'Test_Doc' });
      expect(res).toBe(true);
      expect(global.window.print).toHaveBeenCalledTimes(1);
    });

    it('returns false if window.print is missing in non-browser env', async () => {
      delete global.window;
      const res = await printDocument({ name: 'Test_Doc' });
      expect(res).toBe(false);
    });
  });

  describe('downloadOrShareTextFile', () => {
    it('returns false if content is empty or null', async () => {
      expect(await downloadOrShareTextFile({ fileName: 'test.csv', content: '' })).toBe(false);
      expect(await downloadOrShareTextFile({ fileName: 'test.csv', content: null })).toBe(false);
    });

    it('creates a download link and triggers click on web', async () => {
      const res = await downloadOrShareTextFile({
        fileName: 'test.csv',
        content: 'col1,col2\nval1,val2',
        mimeType: 'text/csv',
      });

      expect(res).toBe(true);
      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(global.document.body.appendChild).toHaveBeenCalled();
      expect(global.document.body.removeChild).toHaveBeenCalled();
    });
  });

  describe('buildPrintableHtmlDocument', () => {
    it('returns empty string if element is not found', () => {
      expect(buildPrintableHtmlDocument({ title: 'Test', elementId: 'non-existent' })).toBe('');
    });

    it('packages element content into html document', () => {
      const html = buildPrintableHtmlDocument({ title: 'অডিট রিপোর্ট', elementId: 'report-test' });
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>অডিট রিপোর্ট</title>');
      expect(html).toContain('<h1>হিসাব বিবরণী</h1>');
    });
  });
});
