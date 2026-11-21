export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type UserRole = 'requester' | 'donor' | 'admin';

export type UserStatus = 'active' | 'banned';

export type DonorAvailability = 'available' | 'paused';

export type Gender = 'male' | 'female' | 'other';

export type UrgencyLevel = 'critical' | 'urgent' | 'planned';

export type RequestState =
  | 'DRAFT'
  | 'VERIFYING'
  | 'OPEN'
  | 'MATCHING'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REJECTED';

export type NotificationStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export type NotificationResponse = 'ACCEPTED' | 'DECLINED' | null;

export type AcceptanceStatus = 'ACCEPTED' | 'WAITLISTED' | 'WITHDRAWN' | 'DONATED' | 'NO_SHOW';

export type NotificationChannel = 'whatsapp' | 'sms';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}
