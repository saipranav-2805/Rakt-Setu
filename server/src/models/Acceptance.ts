import mongoose, { Schema, Document, Types } from 'mongoose';
import { AcceptanceStatus } from '../types/index.js';

export interface IAcceptance extends Document {
  requestId: Types.ObjectId;
  donorId: Types.ObjectId;
  status: AcceptanceStatus;
  acceptedAt: Date;
  screeningAnswers?: Record<string, any>;
  contactRevealedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AcceptanceSchema = new Schema<IAcceptance>(
  {
    requestId: {
      type: Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
      index: true
    },
    donorId: {
      type: Schema.Types.ObjectId,
      ref: 'Donor',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['ACCEPTED', 'WAITLISTED', 'WITHDRAWN', 'DONATED', 'NO_SHOW'],
      default: 'ACCEPTED'
    },
    acceptedAt: {
      type: Date,
      default: () => new Date()
    },
    screeningAnswers: {
      type: Schema.Types.Mixed,
      default: {}
    },
    contactRevealedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Blueprint Section 9 Required Index:
// Unique compound index on (requestId, donorId) prevents duplicates
AcceptanceSchema.index({ requestId: 1, donorId: 1 }, { unique: true });

export const Acceptance = mongoose.model<IAcceptance>('Acceptance', AcceptanceSchema);
