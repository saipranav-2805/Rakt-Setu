import mongoose, { Schema, Document, Types } from 'mongoose';
import { NotificationChannel, NotificationResponse, NotificationStatus } from '../types/index.js';

export interface INotification extends Document {
  requestId: Types.ObjectId;
  donorId: Types.ObjectId;
  wave: number;
  channel: NotificationChannel;
  providerMessageId?: string;
  status: NotificationStatus;
  sentAt?: Date;
  respondedAt?: Date;
  response: NotificationResponse;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
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
    wave: {
      type: Number,
      required: true
    },
    channel: {
      type: String,
      enum: ['whatsapp', 'sms'],
      default: 'whatsapp'
    },
    providerMessageId: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED'],
      default: 'QUEUED'
    },
    sentAt: {
      type: Date
    },
    respondedAt: {
      type: Date
    },
    response: {
      type: String,
      enum: ['ACCEPTED', 'DECLINED', null],
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Blueprint Section 9 Required Index:
// notifications (requestId, donorId) unique
NotificationSchema.index({ requestId: 1, donorId: 1 }, { unique: true });

export const NotificationModel = mongoose.model<INotification>('Notification', NotificationSchema);
