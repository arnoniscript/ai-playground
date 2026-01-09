import express from 'express';
import cors from 'cors';
import { config, validateConfig } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import playgroundRoutes from './routes/playgrounds.js';
import coursesAdminRoutes from './routes/courses-admin.js';
import coursesRoutes from './routes/courses.js';
import coursesMetricsRoutes from './routes/courses-metrics.js';
import notificationsRoutes from './routes/notifications.js';
import earningsRoutes from './routes/earnings.js';
import bankAccountsRoutes from './routes/bank-accounts.js';

// Validate environment
validateConfig();

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' })); // Increased limit for base64 image uploads
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/playgrounds', playgroundRoutes);
app.use('/admin/courses', coursesAdminRoutes);
app.use('/courses', coursesRoutes);
app.use('/admin/courses', coursesMetricsRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/earnings', earningsRoutes);
app.use('/bank-accounts', bankAccountsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'AI Marisa Playground API',
    version: '1.0.0',
    status: 'running'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.nodeEnv,
    port: config.server.port
  });
});

// Error handling
app.use(errorHandler);

// Start server
const port = config.server.port;
app.listen(port, () => {
  console.log(`Server running on port ${port} (${config.server.nodeEnv})`);
});
