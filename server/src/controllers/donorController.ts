import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { Donor } from '../models/Donor.js';
import { calculateNextEligibleDate, isDemographicallyEligible } from '../config/cooldown.js';

export const registerDonorSchema = z.object({
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  gender: z.enum(['male', 'female', 'other']),
  dob: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  weightKg: z.number().min(30).max(250).optional(),
  location: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([z.number(), z.number()]) // [lng, lat]
  }),
  city: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/, 'Valid 6-digit Indian PIN code required'),
  maxTravelKm: z.number().min(1).max(100).default(15),
  lastDonationAt: z.string().datetime().optional(),
  consent: z.object({
    contact: z.literal(true, { errorMap: () => ({ message: 'Consent to contact is required' }) }),
    whatsapp: z.literal(true, { errorMap: () => ({ message: 'WhatsApp messaging consent is required' }) }),
    version: z.string().default('1.0')
  })
});

export const updateDonorSchema = z.object({
  availability: z.enum(['available', 'paused']).optional(),
  maxTravelKm: z.number().min(1).max(100).optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  location: z
    .object({
      type: z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()])
    })
    .optional()
});

export async function registerDonor(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const parsedDob = new Date(req.body.dob);

  // Demographic check (age 18-65, weight >= 45 kg)
  const eligibility = isDemographicallyEligible(parsedDob, req.body.weightKg);
  if (!eligibility.eligible) {
    res.status(400).json({ success: false, error: eligibility.reason });
    return;
  }

  // Calculate next eligible date based on last donation (or today if none)
  const lastDonation = req.body.lastDonationAt ? new Date(req.body.lastDonationAt) : undefined;
  const nextEligibleAt = lastDonation
    ? calculateNextEligibleDate(lastDonation, req.body.gender)
    : new Date();

  // Upsert donor profile
  let donor = await Donor.findOne({ userId: user._id });
  if (donor) {
    res.status(409).json({ success: false, error: 'Donor profile already registered for this user' });
    return;
  }

  donor = await Donor.create({
    userId: user._id,
    bloodGroup: req.body.bloodGroup,
    gender: req.body.gender,
    dob: parsedDob,
    weightKg: req.body.weightKg,
    location: req.body.location,
    city: req.body.city,
    pincode: req.body.pincode,
    maxTravelKm: req.body.maxTravelKm || 15,
    lastDonationAt: lastDonation,
    nextEligibleAt,
    availability: 'available',
    consent: {
      contact: true,
      whatsapp: true,
      version: req.body.consent.version || '1.0',
      at: new Date()
    },
    responseScore: 1.0
  });

  // Update user role to donor
  user.role = 'donor';
  await user.save();

  res.status(201).json({
    success: true,
    donor
  });
}

export async function updateDonorProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const donor = await Donor.findOneAndUpdate(
    { userId: user._id },
    { $set: req.body },
    { new: true }
  );

  if (!donor) {
    res.status(404).json({ success: false, error: 'Donor profile not found' });
    return;
  }

  res.status(200).json({ success: true, donor });
}

export async function deleteDonorData(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  // DPDP Act 2023: Right to withdraw and delete
  await Donor.findOneAndDelete({ userId: user._id });
  user.status = 'banned'; // Or soft delete
  await user.save();

  res.status(200).json({ success: true, message: 'Your donor record and personal data have been removed' });
}
