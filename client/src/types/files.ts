export interface AppFile {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface StorageInfo {
  usedBytes: number;
  limitBytes: number;
  usedFormatted: string;
  limitFormatted: string;
  usagePercent: number;
}

export interface UploadStatusResponse {
  status: 'processing' | 'done' | 'error';
  error?: string;
}
