export interface SendNotificationOptions {
  toPhone: string;
  donorName?: string;
  bloodGroup: string;
  hospitalName: string;
  distanceKm: number;
  requestCode: string;
  requestLink: string;
  urgency: 'critical' | 'urgent' | 'planned';
}

export interface NotificationResult {
  success: boolean;
  provider: string;
  providerMessageId?: string;
  error?: string;
}

/**
 * Common Notification Provider Interface (Blueprint Section 16)
 */
export interface INotificationProvider {
  sendBloodRequestAlert(options: SendNotificationOptions): Promise<NotificationResult>;
  sendWaitlistAlert(toPhone: string, requestCode: string): Promise<NotificationResult>;
  sendPromotionAlert(toPhone: string, requestCode: string, hospitalName: string): Promise<NotificationResult>;
}
