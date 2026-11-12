import dns from 'node:dns';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import apiRoutes from './routes/api.js';
import { supabase } from './config/supabase.js';

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing with Dynamic Origin Reflection for Vercel CORS & Credentials
const allowedOrigins = [
  'https://sub-guard-ai-sz2a.vercel.app',
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, origin);
    }
    return callback(null, origin);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Root & Cloud Health Check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'SubGuard AI Backend API',
    version: '1.0.0',
    documentation: '/api'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Mount API routes under BOTH /api and root / for universal compatibility with all clients
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Daily Cron Job: Check upcoming payments within 3 days and generate notifications
cron.schedule('0 8 * * *', async () => {
  console.log('[CRON] Running daily renewal inspection...');
  try {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + 3);

    const futureStr = future.toISOString().split('T')[0];

    const { data: upcoming } = await supabase
      .from('subscriptions')
      .select('*, profiles(email)')
      .eq('next_payment_date', futureStr)
      .eq('status', 'active');

    if (upcoming && upcoming.length > 0) {
      for (const sub of upcoming) {
        await supabase.from('notifications').insert([
          {
            user_id: sub.user_id,
            title: `Upcoming Renewal: ${sub.merchant_name}`,
            message: `${sub.merchant_name} will renew for ₹${sub.amount} in 3 days.`,
            type: 'reminder'
          }
        ]);
      }
      console.log(`[CRON] Processed alerts for ${upcoming.length} upcoming subscriptions.`);
    }
  } catch (cronErr) {
    console.warn('[CRON] Local dev fallback active:', cronErr.message);
  }
});

const server = app.listen(PORT, () => {
  console.log(`SubGuard AI Backend running on port ${PORT}`);
});

// Configure server timeouts to support up to 60-second AI generation without premature drops
server.timeout = 120000; // 120s server request timeout
server.keepAliveTimeout = 65000; // 65s keep-alive timeout
server.headersTimeout = 66000; // 66s headers timeout (must exceed keepAliveTimeout)
