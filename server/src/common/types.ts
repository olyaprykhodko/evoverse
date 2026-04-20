export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  storageLimitBytes: number;
  createdAt: string;
}

export interface FileRecord {
  id: string;
  originalName: string;
  storedName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}
