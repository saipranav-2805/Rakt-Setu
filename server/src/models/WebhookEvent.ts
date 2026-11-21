import mongoose, { Schema, Document } from 'mongoose';

export interface IWebhookEvent extends Document {
  provider: string;
  eventId: string;
  receivedAt: Date;
  processedAt?: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    provider: {
      type: String,
      required: true
    },
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    receivedAt: {
      type: Date,
      default: () => new Date()
    },
    processedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Blueprint Section 9 Required Index:
// webhook_events.eventId unique
WebhookEventSchema.index({ eventId: 1 }, { unique: true });

export const WebhookEvent = mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);
