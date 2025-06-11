import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
export async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// Process uploaded files
export async function processFiles(files) {
  await ensureUploadDir();
  
  const processedFiles = await Promise.all(
    files.map(async (file) => {
      const fileId = uuidv4();
      const fileExt = path.extname(file.originalFilename);
      const fileName = `${fileId}${fileExt}`;
      const filePath = path.join(UPLOAD_DIR, fileName);

      // Move file to uploads directory
      await fs.rename(file.filepath, filePath);

      // Read file content based on type
      let content = '';
      if (file.mimetype.startsWith('text/')) {
        content = await fs.readFile(filePath, 'utf-8');
      } else if (file.mimetype.startsWith('image/')) {
        content = `[Image: ${file.originalFilename}]`;
      } else {
        content = `[File: ${file.originalFilename}]`;
      }

      return {
        id: fileId,
        name: file.originalFilename,
        type: file.mimetype,
        size: file.size,
        content,
        path: filePath
      };
    })
  );

  return processedFiles;
}

// Clean up old files
export async function cleanupFiles(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
  try {
    const files = await fs.readdir(UPLOAD_DIR);
    const now = Date.now();

    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(UPLOAD_DIR, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtime.getTime();

        if (age > maxAge) {
          await fs.unlink(filePath);
        }
      })
    );
  } catch (error) {
    console.error('Error cleaning up files:', error);
  }
} 