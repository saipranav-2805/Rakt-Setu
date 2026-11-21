import { INotificationProvider, NotificationResult, SendNotificationOptions } from './NotificationProvider.js';

/**
 * SMS Fallback Provider (Blueprint Section 16)
 * Activated when WhatsApp delivery fails or for critical planned fallbacks
 */
export class SmsProvider implements INotificationProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_SMS_NUMBER || '';
  }

  async sendBloodRequestAlert(options: SendNotificationOptions): Promise<NotificationResult> {
    const body = `EMERGENCY: ${options.bloodGroup} blood needed at ${options.hospitalName} (~${options.distanceKm}km). Can you help? Open: ${options.requestLink}`;
    return this.sendSms(options.toPhone, body);
  }

  async sendWaitlistAlert(toPhone: string, requestCode: string): Promise<NotificationResult> {
    const body = `RaktSetu: Units for request #${requestCode} are currently covered. You are on standby. Thank you.`;
    return this.sendSms(toPhone, body);
  }

  async sendPromotionAlert(toPhone: string, requestCode: string, hospitalName: string): Promise<NotificationResult> {
    const body = `RaktSetu URGENT: A unit is now needed for request #${requestCode} at ${hospitalName}. Open your dashboard immediately.`;
    return this.sendSms(toPhone, body);
  }

  private async sendSms(toPhone: string, body: string): Promise<NotificationResult> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      return { success: false, provider: 'sms', error: 'SMS credentials not configured' };
    }

    try {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const params = new URLSearchParams({
        From: this.fromNumber,
        To: toPhone,
        Body: body
      });

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        }
      );

      const data = await response.json();
      return response.ok
        ? { success: true, provider: 'sms', providerMessageId: data.sid }
        : { success: false, provider: 'sms', error: data.message };
    } catch (err: any) {
      return { success: false, provider: 'sms', error: err.message };
    }
  }
}
