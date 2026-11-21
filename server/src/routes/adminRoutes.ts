import { Router } from 'express';
import { getFlaggedRequests, banUser } from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/requests', requireAuth, requireRole('admin'), getFlaggedRequests);
router.post('/users/:id/ban', requireAuth, requireRole('admin'), banUser);

export default router;
