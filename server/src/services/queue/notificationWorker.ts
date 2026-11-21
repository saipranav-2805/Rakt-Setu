import { Worker, Job } from 'bullmq';
import { redisConnection } from './queues.js';
import { NotificationModel } from '../../models/Notification.js';
import { Donor } from '../../models/Donor.js';
import { RequestModel } from '../../models/Request.js';
import { User } from '../../models/User.js';
import { getNotificationProvider } from '../notifications/index.js';

export interface NotificationJobData {
  notificationId: string;
  requestId: string;
  donorId: string;
  distanceKm: number;
}

/**
 * Worker consuming the notificationQueue to deliver WhatsApp/SMS messages
 */
export const notificationWorker = new Worker<NotificationJobData>(
  'notifications',
  async (job: Job<NotificationJobData>) => {
    const { notificationId, requestId, donorId, distanceKm } = job.data;

    const [notifRecord, donor, request] = await Promise.all([
      NotificationModel.findById(notificationId),
      Donor.findById(donorId).populate('userId'),
      RequestModel.findById(requestId)
    ]);

    if (!notifRecord || !donor || !request) {
      console.warn(`[NotificationWorker] Incomplete data for job ${job.id}`);
      return;
    }

    const donorUser = donor.userId as any;
    const provider = getNotificationProvider();
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    const requestLink = `${appBaseUrl}/r/${request.code}?donor=${donor._id}`;

    const sendResult = await provider.sendBloodRequestAlert({
      toPhone: donorUser.phone,
      donorName: donorUser.name,
      bloodGroup: request.patient.bloodGroup,
      hospitalName: request.hospital.name,
      distanceKm,
      requestCode: request.code,
      requestLink,
      urgency: request.urgency
    });

    if (sendResult.success) {
      notifRecord.status = 'SENT';
      notifRecord.sentAt = new Date();
      notifRecord.providerMessageId = sendResult.providerMessageId;
      await notifRecord.save();

      // Update donor stats
      await Donor.findByIdAndUpdate(donor._id, { $inc: { 'stats.notified': 1 } });
    } else {
      notifRecord.status = 'FAILED';
      await notifRecord.save();
      throw new Error(`Failed to deliver notification: ${sendResult.error}`);
    }
  },
  { connection: redisConnection, concurrency: 10 }
);
