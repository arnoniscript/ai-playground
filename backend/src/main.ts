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

// Validate environment
validateConfig();

const app = express();

// Middleware
app.use(express.json());
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Start server
const port = config.server.port;
app.listen(port, () => {
  console.log(`Server running on port ${port} (${config.server.nodeEnv})`);
});
