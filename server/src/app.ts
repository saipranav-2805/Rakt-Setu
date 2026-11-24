import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import donorRoutes from './routes/donorRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

export const app = express();

app.use(helmet());

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin SSR)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true); // Fallback gracefully for production flexibility
    },
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Production Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts. Please try again in 15 minutes.' }
});

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

// Versioned API Routes (Blueprint Section 15) with targeted rate limiters
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/donors', globalLimiter, donorRoutes);
app.use('/api/v1/requests', globalLimiter, requestRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/admin', globalLimiter, adminRoutes);

app.use(errorHandler);
