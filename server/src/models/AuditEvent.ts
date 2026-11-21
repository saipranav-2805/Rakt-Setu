import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuditEvent extends Document {
  requestId?: Types.ObjectId;
  actor: string;
  type: string;
  payload: Record<string, any>;
  prevHash: string;
  hash: string;
  createdAt: Date;
}

const AuditEventSchema = new Schema<IAuditEvent>(
  {
    requestId: {
      type: Schema.Types.ObjectId,
      ref: 'Request',
      index: true
    },
    actor: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      index: true
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true
    },
    prevHash: {
      type: String,
      required: true
    },
    hash: {
      type: String,
      required: true,
      unique: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export const AuditEvent = mongoose.model<IAuditEvent>('AuditEvent', AuditEventSchema);
