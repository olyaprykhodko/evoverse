import { Router } from 'express';

import { validate } from '#src/middlewares/validate.js';
import { fileController } from './file.controller.js';
import { getUploadStatusSchema, getFileSchema, deleteFileSchema } from './file.schema.js';

const router = Router();

router.post('/files', fileController.uploadFile);
router.get('/files/status/:id', validate(getUploadStatusSchema), fileController.getUploadStatus);
router.get('/files', fileController.getFilesList);
router.get('/files/:id', validate(getFileSchema), fileController.getFile);
router.delete('/files/remove', fileController.removeAllFiles);
router.delete('/files/:id', validate(deleteFileSchema), fileController.deleteFile);

export default router;
