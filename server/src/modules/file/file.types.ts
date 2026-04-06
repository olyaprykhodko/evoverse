export type LoadingStatus = 'loading' | 'done' | 'error';

export type FileRecord = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  receivedSize: number;
  status: LoadingStatus;
  path: string;
  createdAt: Date | null;
};
