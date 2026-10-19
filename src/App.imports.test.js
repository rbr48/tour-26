import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Validates that all JSX components and icons used across all JSX files
 * in src/ are actually imported or declared, preventing runtime ReferenceErrors
 * (such as "ReferenceError: Waves is not defined").
 */
describe('JSX Component & Icon Import Integrity Check', () => {
  function getJsxFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getJsxFiles(fullPath));
      } else if (file.endsWith('.jsx')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const jsxFiles = getJsxFiles('src');

  it('ensures every JSX component referenced in <Component is imported or defined', () => {
    const missingImportsByFile = {};

    for (const filePath of jsxFiles) {
      const content = fs.readFileSync(filePath, 'utf8');

      // 1. Gather all imported identifiers
      const importedIds = new Set();

      // Default imports: import Foo from '...' OR import Foo, { Bar } from '...'
      for (const m of content.matchAll(/import\s+([A-Za-z0-9_]+)\s*(?:,|\s+from)/g)) {
        if (m[1] && m[1] !== 'type') {
          importedIds.add(m[1]);
        }
      }

      // Named destructured imports: import { A, B as C } from '...'
      for (const m of content.matchAll(/import\s+(?:[A-Za-z0-9_]+\s*,\s*)?\{([^}]+)\}/g)) {
        if (m[1]) {
          m[1].split(',').forEach((s) => {
            const parts = s.trim().split(/\s+as\s+/);
            const alias = parts[parts.length - 1].trim();
            if (alias && /^[A-Za-z0-9_]+$/.test(alias)) {
              importedIds.add(alias);
            }
          });
        }
      }

      // Namespace imports: import * as Foo from '...'
      for (const m of content.matchAll(/import\s+\*\s+as\s+([A-Za-z0-9_]+)/g)) {
        if (m[1]) {
          importedIds.add(m[1]);
        }
      }

      // Local declarations: const X = lazy(...) or const X = ... or function X(...)
      const declMatches = [...content.matchAll(/(?:const|let|var|function)\s+([A-Z][A-Za-z0-9_]*)/g)];
      for (const dm of declMatches) {
        importedIds.add(dm[1]);
      }

      // Standard React / JSX primitives
      const allowedPrimitives = new Set([
        'React', 'Fragment', 'Suspense', 'StrictMode',
      ]);

      // 2. Find all JSX element usages: <ComponentName
      const jsxMatches = [...content.matchAll(/<([A-Z][A-Za-z0-9_]*)/g)];
      const missingInThisFile = new Set();

      for (const jm of jsxMatches) {
        const componentName = jm[1];
        if (!importedIds.has(componentName) && !allowedPrimitives.has(componentName)) {
          missingInThisFile.add(componentName);
        }
      }

      if (missingInThisFile.size > 0) {
        missingImportsByFile[filePath] = [...missingInThisFile];
      }
    }

    expect(
      missingImportsByFile,
      `Found unimported JSX components/icons: ${JSON.stringify(missingImportsByFile, null, 2)}`
    ).toEqual({});
  });
});
