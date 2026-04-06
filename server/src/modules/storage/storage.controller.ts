import { Request, Response, NextFunction } from 'express';
import { storageService } from './storage.service.js';
import { type SetLimitInput } from './storage.schema.js';

export const storageController = {
  getLimit: (_req: Request, res: Response) => {
    const data = storageService.getSize();
    res.status(200).json({ message: 'Storage size', data });
  },

  setLimit: (req: Request<object, object, SetLimitInput['body']>, res: Response, next: NextFunction) => {
    try {
      const data = storageService.setLimit(req.body.limit);
      res.status(200).json({ message: 'Storage limit updated', data });
    } catch (err) {
      next(err);
    }
  },
};
