import { getStorageLimit, setStorageLimit, getStorageSize } from '#src/storage.js';
import { AppError } from '#src/middlewares/error-handler.js';

export const storageService = {
  getSize: () => ({
    used: getStorageSize(),
    limit: getStorageLimit(),
  }),

  setLimit: (bytes: number) => {
    try {
      setStorageLimit(bytes);
    } catch (err) {
      if (err instanceof RangeError) {
        throw new AppError(err.message, 400);
      }
      throw err;
    }
    return { limit: getStorageLimit() };
  },
};
