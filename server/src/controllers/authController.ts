import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User.js';

// In-memory OTP storage for dev / test / mock
const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

export const sendOtpSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{9,14}$/, 'Valid E.164 phone number required (e.g. +919876543210)')
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{9,14}$/, 'Valid E.164 phone number required'),
  code: z.string().length(6, '6-digit OTP code required'),
  name: z.string().min(2).optional(),
  role: z.enum(['requester', 'donor', 'admin']).optional()
});

export async function sendOtp(req: Request, res: Response): Promise<void> {
  const { phone } = req.body;

  // Generate 6-digit OTP (in dev/demo fixed code 123456 can be allowed if configured)
  const isDemo = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
  const code = isDemo ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();

  otpStore.set(phone, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes validity
    attempts: 0
  });

  console.log(`[AuthService] OTP for ${phone} is: ${code}`);

  res.status(200).json({
    success: true,
    message: 'OTP dispatched successfully',
    ...(isDemo ? { demoOtp: code } : {})
  });
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { phone, code, name, role } = req.body;
  const stored = otpStore.get(phone);

  if (!stored) {
    res.status(400).json({ success: false, error: 'No OTP requested for this phone number' });
    return;
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one' });
    return;
  }

  if (stored.attempts >= 5) {
    otpStore.delete(phone);
    res.status(429).json({ success: false, error: 'Too many failed attempts. Account temporarily locked.' });
    return;
  }

  if (stored.code !== code) {
    stored.attempts++;
    res.status(400).json({ success: false, error: 'Invalid OTP code' });
    return;
  }

  // OTP verified successfully
  otpStore.delete(phone);

  // Find or create user
  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({
      phone,
      name: name || 'Anonymous User',
      role: role || 'requester',
      phoneVerifiedAt: new Date(),
      status: 'active',
      trustScore: 100
    });
  } else {
    user.phoneVerifiedAt = new Date();
    await user.save();
  }

  const accessSecret = process.env.JWT_ACCESS_SECRET || 'raktsetu_default_dev_secret_32_chars_long!';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'raktsetu_default_refresh_secret_32_chars_long!';

  const accessToken = jwt.sign({ userId: user._id, role: user.role }, accessSecret, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId: user._id }, refreshSecret, { expiresIn: '7d' });

  // Set httpOnly refresh cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.status(200).json({
    success: true,
    accessToken,
    user: {
      id: user._id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      status: user.status
    }
  });
}
