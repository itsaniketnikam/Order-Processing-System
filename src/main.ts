import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupSwagger, SWAGGER_PATH } from './config/swagger.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors();
  app.enableShutdownHooks();

  const port = config.get<number>('app.port') ?? 8080;

  if (config.get<boolean>('app.swaggerEnabled')) {
    setupSwagger(app);
    Logger.log(
      `Swagger UI: http://localhost:${port}/${SWAGGER_PATH}`,
      'Bootstrap',
    );
  } else {
    Logger.warn('Swagger is disabled (SWAGGER_ENABLED=false)', 'Bootstrap');
  }

  await app.listen(port);

  Logger.log(`API listening on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
