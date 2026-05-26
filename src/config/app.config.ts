import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '8080', 10),
  swaggerEnabled:
    (process.env.SWAGGER_ENABLED ?? 'true').toLowerCase() === 'true',

  scheduler: {
    // Cron expression for the PENDING -> PROCESSING transition job.
    // Default is every 5 minutes; tighten in tests via env override.
    processPendingCron:
      process.env.ORDERS_PROCESS_PENDING_CRON ?? '*/5 * * * *',
  },

  adminApiKey: process.env.ADMIN_API_KEY ?? '',
}));
