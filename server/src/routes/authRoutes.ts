import { Router } from 'express';
import { sendOtp, verifyOtp, sendOtpSchema, verifyOtpSchema } from '../controllers/authController.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

router.post('/otp/send', validate(sendOtpSchema), sendOtp);
router.post('/otp/verify', validate(verifyOtpSchema), verifyOtp);

export default router;
