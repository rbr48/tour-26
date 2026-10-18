import { spawn } from 'node:child_process';
import fs from 'node:fs';

/**
 * Checks whether ffmpeg is installed and executable on the host/container.
 */
export function hasFFmpeg() {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version']);
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Compresses an uploaded reel video to an optimized, web-ready 720p H.264 file with AAC audio.
 * Automatically falls back to copying the original file if ffmpeg is missing or fails.
 */
export async function compressVideo(inputPath, outputPath) {
  const originalSize = fs.existsSync(inputPath) ? fs.statSync(inputPath).size : 0;

  const isFfmpegAvailable = await hasFFmpeg();
  if (!isFfmpegAvailable) {
    console.warn('ffmpeg is not installed, keeping original video without compression.');
    if (inputPath !== outputPath) {
      fs.copyFileSync(inputPath, outputPath);
      try { fs.unlinkSync(inputPath); } catch {}
    }
    return {
      success: true,
      compressed: false,
      originalSize,
      compressedSize: originalSize,
    };
  }

  // FFmpeg command arguments:
  // - Scale down to max 720px width/height while maintaining even dimensions for libx264
  // - CRF 26 provides great visual quality on mobile screens with ~70-85% file size reduction
  // - movflags +faststart moves moov atom to the front for instant progressive playback
  const args = [
    '-y',
    '-i', inputPath,
    '-vf', "scale='if(gt(iw,ih),min(720,iw),-2)':'if(gt(iw,ih),-2,min(720,ih))'",
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '26',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    outputPath,
  ];

  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      console.warn('ffmpeg spawn failed, using original video:', err.message);
      if (inputPath !== outputPath) {
        fs.copyFileSync(inputPath, outputPath);
        try { fs.unlinkSync(inputPath); } catch {}
      }
      resolve({
        success: true,
        compressed: false,
        originalSize,
        compressedSize: originalSize,
      });
    });

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        const compressedSize = fs.statSync(outputPath).size;
        console.log(`Video compressed successfully: ${originalSize} -> ${compressedSize} bytes (${Math.round((1 - compressedSize / originalSize) * 100)}% saved)`);
        if (inputPath !== outputPath) {
          try { fs.unlinkSync(inputPath); } catch {}
        }
        resolve({
          success: true,
          compressed: true,
          originalSize,
          compressedSize,
        });
      } else {
        console.warn(`ffmpeg exited with code ${code}, falling back to original:`, stderr.slice(-300));
        if (inputPath !== outputPath) {
          fs.copyFileSync(inputPath, outputPath);
          try { fs.unlinkSync(inputPath); } catch {}
        }
        resolve({
          success: true,
          compressed: false,
          originalSize,
          compressedSize: originalSize,
        });
      }
    });
  });
}
