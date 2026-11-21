import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import donorRoutes from './routes/donorRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Nearby reference facilities (Section 15)
app.get('/api/v1/facilities/nearby', (req, res) => {
  res.status(200).json({
    success: true,
    facilities: [
      { id: 'f1', name: 'City Red Cross Blood Bank', type: 'blood_bank', lat: 17.44, lng: 78.38, distanceKm: 2.4 },
      { id: 'f2', name: 'Apollo Main Emergency Wing', type: 'hospital', lat: 17.43, lng: 78.41, distanceKm: 4.1 },
      { id: 'f3', name: 'Government Civil Blood Centre', type: 'blood_bank', lat: 17.40, lng: 78.47, distanceKm: 7.2 }
    ]
  });
});

// Versioned API Routes (Blueprint Section 15)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/donors', donorRoutes);
app.use('/api/v1/requests', requestRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use(errorHandler);
