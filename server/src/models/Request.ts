import mongoose, { Schema, Document, Types } from 'mongoose';
import { BloodGroup, Gender, GeoPoint, RequestState, UrgencyLevel } from '../types/index.js';

export interface IPatient {
  age: number;
  gender: Gender;
  bloodGroup: BloodGroup;
}

export interface IHospital {
  name: string;
  address: string;
  location: GeoPoint;
}

export interface IRequest extends Document {
  code: string;
  requesterId: Types.ObjectId;
  patient: IPatient;
  unitsNeeded: number;
  unitsConfirmed: number;
  hospital: IHospital;
  urgency: UrgencyLevel;
  compatibleGroups: BloodGroup[];
  state: RequestState;
  currentWave: number;
  radiusKm: number;
  expiresAt: Date;
  message: string;
  riskScore: number;
  version: number;
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

const RequestSchema = new Schema<IRequest>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    patient: {
      age: { type: Number, required: true },
      gender: { type: String, enum: ['male', 'female', 'other'], required: true },
      bloodGroup: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        required: true
      }
    },
    unitsNeeded: {
      type: Number,
      required: true,
      min: 1
    },
    unitsConfirmed: {
      type: Number,
      required: true,
      default: 0
    },
    hospital: {
      name: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      location: { type: PointSchema, required: true }
    },
    urgency: {
      type: String,
      enum: ['critical', 'urgent', 'planned'],
      required: true,
      default: 'urgent'
    },
    compatibleGroups: [
      {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
      }
    ],
    state: {
      type: String,
      enum: [
        'DRAFT',
        'VERIFYING',
        'OPEN',
        'MATCHING',
        'PARTIALLY_FULFILLED',
        'FULFILLED',
        'EXPIRED',
        'CANCELLED',
        'REJECTED'
      ],
      default: 'DRAFT',
      index: true
    },
    currentWave: {
      type: Number,
      default: 0
    },
    radiusKm: {
      type: Number,
      default: 5
    },
    expiresAt: {
      type: Date,
      required: true
    },
    message: {
      type: String,
      default: ''
    },
    riskScore: {
      type: Number,
      default: 0
    },
    version: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

// Blueprint Section 9 Required Index:
// requests.state + expiresAt for the expiry sweeps
RequestSchema.index({ state: 1, expiresAt: 1 });

export const RequestModel = mongoose.model<IRequest>('Request', RequestSchema);
