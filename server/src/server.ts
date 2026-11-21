import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { app } from './app.js';

const PORT = parseInt(process.env.PORT || '5000', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/raktsetu';

async function bootstrap() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[Database] Connected to MongoDB at ${MONGODB_URI}`);

    app.listen(PORT, () => {
      console.log(`[RaktSetu API] Server listening on port ${PORT}`);
      console.log(`[Health] http://localhost:${PORT}/health`);
    });
  } catch (err) {
    console.error('[Bootstrap Error]', err);
    process.exit(1);
  }
}

bootstrap();
