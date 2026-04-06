import { z } from 'zod';

const MAX_LIMIT = 1024 * 1024 * 1024;

export const setLimitSchema = z.object({
  body: z.object({
    limit: z
      .number({ error: 'limit must be a number' })
      .int('limit must be an integer')
      .min(1, 'limit must be at least 1 byte')
      .max(MAX_LIMIT, `limit must not exceed ${MAX_LIMIT} bytes (1 GB)`),
  }),
});

export type SetLimitInput = z.infer<typeof setLimitSchema>;
