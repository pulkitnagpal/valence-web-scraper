import { promises as fs } from 'node:fs';
import path from 'node:path';

export async function appendErrorLog(logPath: string, message: string): Promise<void> {
  const entry = `[${new Date().toISOString()}] ${message}\n`;
  await fs.appendFile(path.resolve(logPath), entry, 'utf-8');
}
