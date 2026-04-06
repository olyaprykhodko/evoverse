import { z } from 'zod';

export const getUploadStatusSchema = z.object({
  params: z.object({
    id: z.uuid('Invalid file ID'),
  }),
});

export const getFileSchema = z.object({
  params: z.object({
    id: z.uuid('Invalid file ID'),
  }),
});

export const deleteFileSchema = z.object({
  params: z.object({
    id: z.uuid('Invalid file ID'),
  }),
});

export type GetUploadStatusInput = z.infer<typeof getUploadStatusSchema>;
export type GetFileInput = z.infer<typeof getFileSchema>;
export type DeleteFileInput = z.infer<typeof deleteFileSchema>;
