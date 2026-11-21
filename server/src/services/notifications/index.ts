import { INotificationProvider } from './NotificationProvider.js';
import { MockProvider } from './MockProvider.js';
import { TwilioProvider } from './TwilioProvider.js';
import { WhatsAppCloudProvider } from './WhatsAppCloudProvider.js';
import { SmsProvider } from './SmsProvider.js';

let activeProvider: INotificationProvider | null = null;

/**
 * Factory returning the configured NotificationProvider singleton
 * Selectable via NOTIFICATION_PROVIDER environment variable ('mock' | 'twilio' | 'whatsapp_cloud' | 'sms')
 */
export function getNotificationProvider(): INotificationProvider {
  if (activeProvider) {
    return activeProvider;
  }

  const providerType = (process.env.NOTIFICATION_PROVIDER || 'mock').toLowerCase();

  switch (providerType) {
    case 'twilio':
      activeProvider = new TwilioProvider();
      break;
    case 'whatsapp_cloud':
      activeProvider = new WhatsAppCloudProvider();
      break;
    case 'sms':
      activeProvider = new SmsProvider();
      break;
    case 'mock':
    default:
      activeProvider = new MockProvider();
      break;
  }

  return activeProvider;
}

export function setNotificationProvider(provider: INotificationProvider): void {
  activeProvider = provider;
}
