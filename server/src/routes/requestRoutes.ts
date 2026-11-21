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
import { requireAuth, optionalAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

router.post('/', requireAuth, validate(createRequestSchema), createEmergencyRequest);
router.get('/:code', getPublicRequestByCode);
router.get('/:id/stream', streamRequestUpdates);
router.post('/:id/accept', optionalAuth, acceptRequest);
router.post('/:id/close', requireAuth, closeRequest);
router.post('/:id/report', optionalAuth, reportSuspiciousRequest);

export default router;
