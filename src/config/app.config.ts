import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '8080', 10),
  swaggerEnabled:
    (process.env.SWAGGER_ENABLED ?? 'true').toLowerCase() === 'true',
}));
