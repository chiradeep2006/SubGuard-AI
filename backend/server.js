import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import apiRoutes from './routes/api.js';
import { supabase } from './config/supabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Mount API routes
app.use('/api', apiRoutes);

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

app.get('/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date() }));

app.listen(PORT, () => {
  console.log(`SubGuard AI Backend running on port ${PORT}`);
});

