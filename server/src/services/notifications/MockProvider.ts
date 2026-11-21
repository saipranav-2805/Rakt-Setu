import { INotificationProvider, NotificationResult, SendNotificationOptions } from './NotificationProvider.js';

export interface MockDispatchedMessage {
  toPhone: string;
  type: string;
  payload: any;
  sentAt: Date;
}

/**
 * Mock Provider for development, automated tests, and local demos
 * Stores all dispatched messages in an in-memory queue for easy inspection
 */
export class MockProvider implements INotificationProvider {
  public dispatched: MockDispatchedMessage[] = [];

  async sendBloodRequestAlert(options: SendNotificationOptions): Promise<NotificationResult> {
    const id = `mock_msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const text = `Urgent: ${options.bloodGroup} blood needed at ${options.hospitalName}, ~${options.distanceKm} km from you. Can you help? Reply YES or NO, or open: ${options.requestLink}`;

    this.dispatched.push({
      toPhone: options.toPhone,
      type: 'BLOOD_REQUEST_ALERT',
      payload: { ...options, renderedText: text },
      sentAt: new Date()
    });

    return {
      success: true,
      provider: 'mock',
      providerMessageId: id
    };
  }

  async sendWaitlistAlert(toPhone: string, requestCode: string): Promise<NotificationResult> {
    const id = `mock_waitlist_${Date.now()}`;
    this.dispatched.push({
      toPhone,
      type: 'WAITLIST_ALERT',
      payload: { requestCode },
      sentAt: new Date()
    });
    return { success: true, provider: 'mock', providerMessageId: id };
  }

  async sendPromotionAlert(toPhone: string, requestCode: string, hospitalName: string): Promise<NotificationResult> {
    const id = `mock_promotion_${Date.now()}`;
    this.dispatched.push({
      toPhone,
      type: 'PROMOTION_ALERT',
      payload: { requestCode, hospitalName },
      sentAt: new Date()
    });
    return { success: true, provider: 'mock', providerMessageId: id };
  }

  clear(): void {
    this.dispatched = [];
  }
}
