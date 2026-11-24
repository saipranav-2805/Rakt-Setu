import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { app } from './app.js';
import { redisConnection } from './services/queue/queues.js';

const PORT = parseInt(process.env.PORT || '5000', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/raktsetu';

async function bootstrap() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[Database] Connected to MongoDB at ${MONGODB_URI}`);

    const server = app.listen(PORT, () => {
      console.log(`[RaktSetu API] Server listening on port ${PORT}`);
      console.log(`[Health] http://localhost:${PORT}/health`);
    });

    // Graceful Shutdown Handler for Container Orchestration
    let isShuttingDown = false;
    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`[RaktSetu API] Received ${signal}. Starting graceful shutdown...`);

      // 1. Stop accepting new connections
      server.close(async () => {
        console.log('[RaktSetu API] HTTP server closed.');

        try {
          // 2. Disconnect Mongoose
          await mongoose.disconnect();
          console.log('[Database] MongoDB connection closed.');

          // 3. Disconnect Redis
          redisConnection.disconnect();
          console.log('[Redis] Redis connection closed.');

          process.exit(0);
        } catch (err) {
          console.error('[RaktSetu API] Error during shutdown:', err);
          process.exit(1);
        }
      });

      // Force terminate if graceful shutdown hangs
      setTimeout(() => {
        console.error('[RaktSetu API] Graceful shutdown timed out. Forcing exit.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    console.error('[Bootstrap Error]', err);
    process.exit(1);
  }
}

bootstrap();
