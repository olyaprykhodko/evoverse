import { Router } from 'express';
import { validate } from '#src/middlewares/validate.js';
import { storageController } from './storage.controller.js';
import { setLimitSchema } from './storage.schema.js';

const router = Router();

router.get('/storage', storageController.getLimit);
router.put('/storage/limit', validate(setLimitSchema), storageController.setLimit);

export default router;
