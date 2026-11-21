import mongoose, { Schema, Document, Types } from 'mongoose';
import { BloodGroup, DonorAvailability, Gender, GeoPoint } from '../types/index.js';

export interface IDonorConsent {
  contact: boolean;
  whatsapp: boolean;
  version: string;
  at: Date;
}

export interface IDonorStats {
  notified: number;
  accepted: number;
  declined: number;
  noResponse: number;
  donated: number;
}

export interface IDonor extends Document {
  userId: Types.ObjectId;
  bloodGroup: BloodGroup;
  gender: Gender;
  dob: Date;
  weightKg?: number;
  location: GeoPoint;
  city: string;
  pincode: string;
  maxTravelKm: number;
  lastDonationAt?: Date;
  nextEligibleAt: Date;
  availability: DonorAvailability;
  consent: IDonorConsent;
  stats: IDonorStats;
  responseScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const PointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  { _id: false }
);

const DonorSchema = new Schema<IDonor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
      index: true
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true
    },
    dob: {
      type: Date,
      required: true
    },
    weightKg: {
      type: Number
    },
    location: {
      type: PointSchema,
      required: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    pincode: {
      type: String,
      required: true,
      trim: true
    },
    maxTravelKm: {
      type: Number,
      default: 15
    },
    lastDonationAt: {
      type: Date
    },
    nextEligibleAt: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true
    },
    availability: {
      type: String,
      enum: ['available', 'paused'],
      default: 'available',
      index: true
    },
    consent: {
      contact: { type: Boolean, required: true, default: true },
      whatsapp: { type: Boolean, required: true, default: true },
      version: { type: String, required: true, default: '1.0' },
      at: { type: Date, required: true, default: () => new Date() }
    },
    stats: {
      notified: { type: Number, default: 0 },
      accepted: { type: Number, default: 0 },
      declined: { type: Number, default: 0 },
      noResponse: { type: Number, default: 0 },
      donated: { type: Number, default: 0 }
    },
    responseScore: {
      type: Number,
      default: 1.0 // Initial neutral-high score for new willing donors
    }
  },
  {
    timestamps: true
  }
);

// Blueprint Section 9 Required Indexes:
// 1. 2dsphere geospatial index on location
DonorSchema.index({ location: '2dsphere' });

// 2. Compound index on (bloodGroup, availability, nextEligibleAt)
DonorSchema.index({ bloodGroup: 1, availability: 1, nextEligibleAt: 1 });

export const Donor = mongoose.model<IDonor>('Donor', DonorSchema);
