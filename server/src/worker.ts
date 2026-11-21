import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import './models/User.js';
import './models/Donor.js';
import './models/Request.js';
import './models/Notification.js';
import './models/Acceptance.js';
import './models/AuditEvent.js';
import { waveWorker } from './services/queue/waveWorker.js';
import { notificationWorker } from './services/queue/notificationWorker.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/raktsetu';

async function startWorkers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[Worker Process] Connected to MongoDB at ${MONGODB_URI}`);
    console.log('[Worker Process] BullMQ Wave Worker and Notification Worker are active.');

    const gracefulShutdown = async () => {
      console.log('[Worker Process] Shutting down workers gracefully...');
      await Promise.all([waveWorker.close(), notificationWorker.close()]);
      await mongoose.disconnect();
      process.exit(0);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (err) {
    console.error('[Worker Process Error]', err);
    process.exit(1);
  }
}

startWorkers();
