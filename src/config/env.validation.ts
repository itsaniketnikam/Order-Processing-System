import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(8080),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_NAME: Joi.string().required(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('3600s'),

  SWAGGER_ENABLED: Joi.boolean().default(true),

  // Cron expression for the PENDING -> PROCESSING transition job.
  // 5-field (minute hour day month weekday). Default = every 5 minutes.
  ORDERS_PROCESS_PENDING_CRON: Joi.string().default('*/5 * * * *'),

  // Shared secret for fulfillment status updates (X-Admin-Key header).
  ADMIN_API_KEY: Joi.string().min(8).required(),
});
