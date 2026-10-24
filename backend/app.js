import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

// Import routes
import authRoutes from './routes/auth.js';
import tripRoutes from './routes/trips.js';
import inviteRoutes from './routes/invites.js';
import weatherRoutes from './routes/weather.js';
import placesRoutes from './routes/places.js';
import currencyRoutes from './routes/currency.js';

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
// Request logs would drown out test output
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}
// CLIENT_URL may be a full URL or a bare host (Render's service references give hosts),
// and may list several origins separated by commas
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim().replace(/\/$/, ''))
  .filter(Boolean)
  .map(origin => (/^https?:\/\//.test(origin) ? origin : `https://${origin}`));

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/currency', currencyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'AI Travel Assistant API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;
