import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';

import type { UserRecord, FileRecord } from '../common/types';

@Injectable()
export class StorageService {
  private readonly dataDir = path.resolve(process.cwd(), 'data');
  private readonly filesDir = path.join(this.dataDir, 'files');
  private readonly usersFile = path.join(this.dataDir, 'users.json');

  constructor() {
    fs.mkdirSync(this.filesDir, { recursive: true });
    if (!fs.existsSync(this.usersFile)) {
      fs.writeFileSync(this.usersFile, '[]', 'utf-8');
    }
  }

  readUsers(): UserRecord[] {
    const users = fs.readFileSync(this.usersFile, 'utf-8');
    return JSON.parse(users);
  }

  writeUsers(users: UserRecord[]): void {
    fs.writeFileSync(this.usersFile, JSON.stringify(users, null, 2), 'utf-8');
  }

  getUserDir(userId: string): string {
    const dir = path.join(this.filesDir, userId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  removeUserDir(userId: string): void {
    const dir = path.join(this.filesDir, userId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  private metadataPath(userId: string): string {
    return path.join(this.getUserDir(userId), 'metadata.json');
  }

  readMetadata(userId: string): FileRecord[] {
    const p = this.metadataPath(userId);
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, 'utf-8');
    return JSON.parse(raw);
  }

  writeMetadata(userId: string, records: FileRecord[]): void {
    const p = this.metadataPath(userId);
    fs.writeFileSync(p, JSON.stringify(records, null, 2), 'utf-8');
  }

  getUserStorageUsed(userId: string): number {
    const records = this.readMetadata(userId);
    return records.reduce((sum, r) => sum + r.size, 0);
  }

  normalizeFileName(name: string): string {
    return name
      .replace(/[/\\]/g, '')
      .replace(/\.\./g, '')
      .replace(/[\x00-\x1f\x7f]/g, '')
      .replace(/[<>:"|?*]/g, '')
      .trim();
  }

  resolveUniqueFileName(dir: string, name: string): string {
    const ext = path.extname(name);
    const base = path.basename(name, ext);
    let freeName = name;
    let counter = 1;

    while (fs.existsSync(path.join(dir, freeName))) {
      freeName = `${base}-${counter}${ext}`;
      counter++;
    }

    return freeName;
  }
}
