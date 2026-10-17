import fs from 'node:fs/promises';
import path from 'node:path';

// Same file name as the original server so the existing backup stays readable.
export const BACKUP_FILE_NAME = 'tour_data.json';

/**
 * Stores the latest backup as one JSON file. Writes go to a temporary file that
 * is fsynced and renamed into place, so a crash never leaves a half-written
 * backup, and the previous version is kept as `<file>.bak`.
 */
export function createBackupStore(dataDir) {
  const file = path.join(dataDir, BACKUP_FILE_NAME);
  let queue = Promise.resolve();

  const enqueue = (task) => {
    const run = queue.then(task, task);
    queue = run.catch(() => {});
    return run;
  };

  return {
    file,

    read() {
      return fs.readFile(file, 'utf8').then(
        (raw) => JSON.parse(raw),
        (err) => {
          if (err.code === 'ENOENT') return null;
          throw err;
        },
      );
    },

    write(document) {
      return enqueue(async () => {
        await fs.mkdir(dataDir, { recursive: true });
        const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
        try {
          const handle = await fs.open(tmp, 'w');
          try {
            await handle.writeFile(JSON.stringify(document), 'utf8');
            await handle.sync();
          } finally {
            await handle.close();
          }
          try {
            await fs.copyFile(file, `${file}.bak`);
          } catch (err) {
            if (err.code !== 'ENOENT') throw err;
          }
          await fs.rename(tmp, file);
        } catch (err) {
          await fs.rm(tmp, { force: true });
          throw err;
        }
      });
    },
  };
}
