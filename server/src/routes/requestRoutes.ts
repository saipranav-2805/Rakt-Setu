import { Router } from 'express';
import {
  createEmergencyRequest,
  getPublicRequestByCode,
  streamRequestUpdates,
  acceptRequest,
  closeRequest,
  reportSuspiciousRequest,
  createRequestSchema
} from '../controllers/requestController.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

router.post('/', requireAuth, validate(createRequestSchema), createEmergencyRequest);
router.get('/:code', getPublicRequestByCode);
router.get('/:id/stream', streamRequestUpdates);
router.post('/:id/accept', requireAuth, acceptRequest);
router.post('/:id/close', requireAuth, closeRequest);
router.post('/:id/report', requireAuth, reportSuspiciousRequest);

export default router;
