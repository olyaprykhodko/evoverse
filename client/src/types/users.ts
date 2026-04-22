export interface Auth {
  email: string;
  password: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  storageLimitBytes: number;
  role: 'user' | 'admin';
  blocked: boolean;
  createdAt: string;
}

export interface AdminUser extends SafeUser {
  files: {
    id: string;
    originalName: string;
    storedName: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
  }[];
}
