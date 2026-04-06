import fs from 'node:fs';
import path from 'node:path';

import { Request, Response, NextFunction } from 'express';

import { ALLOWED_EXT } from '#src/storage.js';
import { fileService, normalizeFileName } from './file.service.js';
import { type GetUploadStatusInput, type GetFileInput, type DeleteFileInput } from './file.schema.js';

export const fileController = {
  uploadFile: (req: Request, res: Response, next: NextFunction) => {
    const fileName = normalizeFileName(req.headers['x-file-name']);
    const fileSize = req.headers['content-length'];

    if (!fileName) {
      res.status(400).json({ message: 'Invalid file name' });
      return;
    }

    const fileExt = path.extname(fileName).slice(1).toLowerCase();

    if (!fileExt || !ALLOWED_EXT[fileExt]) {
      res.status(400).json({
        message: 'Invalid file format. Please choose .pdf, .png, .jpeg, .txt, or .json extension',
      });
      return;
    }

    if (!fileSize || isNaN(parseInt(fileSize))) {
      res.status(400).json({ message: 'Invalid file size' });
      return;
    }

    fileService
      .uploadFile(req, { fileName, fileExt, size: parseInt(fileSize) })
      .then((record) => res.status(201).json({ message: 'File successfully uploaded', data: record }))
      .catch(next);
  },

  getUploadStatus: (req: Request<GetUploadStatusInput['params']>, res: Response, next: NextFunction) => {
    try {
      const data = fileService.getUploadStatus(req.params.id);
      res.status(200).json({ message: 'Loading file', data });
    } catch (err) {
      next(err);
    }
  },

  getFilesList: (_req: Request, res: Response) => {
    const data = fileService.getFilesList();
    res.status(200).json({ message: 'Files list retrieved', data });
  },

  getFile: (req: Request<GetFileInput['params']>, res: Response, next: NextFunction) => {
    try {
      const record = fileService.getFileRecord(req.params.id);
      res.setHeader('Content-Type', record.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${record.fileName}"`);
      fs.createReadStream(record.path).pipe(res);
    } catch (err) {
      next(err);
    }
  },

  deleteFile: async (req: Request<DeleteFileInput['params']>, res: Response, next: NextFunction) => {
    try {
      await fileService.deleteFile(req.params.id);
      res.status(200).json({
        message: 'File successfully deleted',
        data: req.params.id,
      });
    } catch (err) {
      next(err);
    }
  },

  removeAllFiles: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await fileService.removeAllFiles();
      res.status(200).json({ message: 'Storage cleared' });
    } catch (err) {
      next(err);
    }
  },
};
