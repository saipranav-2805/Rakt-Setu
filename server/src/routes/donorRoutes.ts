import { Router } from 'express';
import {
  registerDonor,
  updateDonorProfile,
  deleteDonorData,
  registerDonorSchema,
  updateDonorSchema
} from '../controllers/donorController.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

router.post('/', requireAuth, validate(registerDonorSchema), registerDonor);
router.patch('/me', requireAuth, validate(updateDonorSchema), updateDonorProfile);
router.delete('/me', requireAuth, deleteDonorData);

export default router;
