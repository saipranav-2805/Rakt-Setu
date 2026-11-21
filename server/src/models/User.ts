import mongoose, { Schema, Document } from 'mongoose';
import { UserRole, UserStatus } from '../types/index.js';

export interface IUser extends Document {
  phone: string;
  role: UserRole;
  name: string;
  phoneVerifiedAt?: Date;
  status: UserStatus;
  trustScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    role: {
      type: String,
      enum: ['requester', 'donor', 'admin'],
      default: 'donor'
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phoneVerifiedAt: {
      type: Date
    },
    status: {
      type: String,
      enum: ['active', 'banned'],
      default: 'active',
      index: true
    },
    trustScore: {
      type: Number,
      default: 100
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
