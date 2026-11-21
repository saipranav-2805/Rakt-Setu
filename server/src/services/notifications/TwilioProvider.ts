import { INotificationProvider, NotificationResult, SendNotificationOptions } from './NotificationProvider.js';

/**
 * Twilio WhatsApp Sandbox Provider (Blueprint Section 16)
 * Allows testing full WhatsApp messaging without Meta business verification
 */
export class TwilioProvider implements INotificationProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
  }

  async sendBloodRequestAlert(options: SendNotificationOptions): Promise<NotificationResult> {
    const body = `Urgent: ${options.bloodGroup} blood needed at ${options.hospitalName}, ~${options.distanceKm} km from you. Can you help? Reply YES or NO, or open: ${options.requestLink}`;
    return this.sendTwilioMessage(options.toPhone, body);
  }

  async sendWaitlistAlert(toPhone: string, requestCode: string): Promise<NotificationResult> {
    const body = `Thank you for responding! The required units for request #${requestCode} are currently covered. You have been placed on standby. We will alert you immediately if needed.`;
    return this.sendTwilioMessage(toPhone, body);
  }

  async sendPromotionAlert(toPhone: string, requestCode: string, hospitalName: string): Promise<NotificationResult> {
    const body = `Urgent Update: A unit is now needed for request #${requestCode} at ${hospitalName}. Please open your request dashboard to proceed.`;
    return this.sendTwilioMessage(toPhone, body);
  }

  private async sendTwilioMessage(toPhone: string, body: string): Promise<NotificationResult> {
    if (!this.accountSid || !this.authToken) {
      return { success: false, provider: 'twilio', error: 'Twilio credentials not configured' };
    }

    try {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const params = new URLSearchParams({
        From: this.fromNumber,
        To: toPhone.startsWith('whatsapp:') ? toPhone : `whatsapp:${toPhone}`,
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

      const data = (await response.json()) as any;
      if (!response.ok) {
        return { success: false, provider: 'twilio', error: data.message || 'Twilio send failed' };
      }

      return {
        success: true,
        provider: 'twilio',
        providerMessageId: data.sid
      };
    } catch (err: any) {
      return { success: false, provider: 'twilio', error: err.message };
    }
  }
}
