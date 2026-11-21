import { Router } from 'express';
import { handleWhatsAppWebhook } from '../controllers/webhookController.js';

const router = Router();

router.get('/whatsapp', handleWhatsAppWebhook);
router.post('/whatsapp', handleWhatsAppWebhook);

export default router;
