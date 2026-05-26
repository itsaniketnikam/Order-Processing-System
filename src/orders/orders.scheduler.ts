import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob, validateCronExpression } from 'cron';
import { OrdersService } from './orders.service';

/**
 * Background job that promotes PENDING orders to PROCESSING on a configurable
 * cron schedule (default: every 5 minutes; controlled by
 * `ORDERS_PROCESS_PENDING_CRON`).
 *
 * Why register dynamically via SchedulerRegistry instead of `@Cron(...)`?
 *   The `@Cron` decorator captures the cron expression at module-load time,
 *   before ConfigService is initialized. Going through SchedulerRegistry
 *   inside `OnApplicationBootstrap` lets us read the value from the typed
 *   config namespace and still benefit from Nest's scheduler lifecycle.
 *
 * The job is wrapped in try/catch so one bad run never crashes the scheduler;
 * we just log the error and let the next tick run.
 */
@Injectable()
export class OrdersScheduler
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(OrdersScheduler.name);
  private static readonly JOB_NAME = 'orders:process-pending';

  constructor(
    private readonly ordersService: OrdersService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    const cronExpression = this.configService.getOrThrow<string>(
      'app.scheduler.processPendingCron',
    );

    const validation = validateCronExpression(cronExpression);
    if (!validation.valid) {
      throw new Error(
        `Invalid ORDERS_PROCESS_PENDING_CRON expression "${cronExpression}": ` +
          `${validation.error?.message ?? 'unknown error'}`,
      );
    }

    const job = new CronJob(cronExpression, () => {
      void this.runJob();
    });

    this.schedulerRegistry.addCronJob(OrdersScheduler.JOB_NAME, job);
    job.start();

    this.logger.log(
      `Scheduled "${OrdersScheduler.JOB_NAME}" with cron "${cronExpression}"`,
    );
  }

  onModuleDestroy(): void {
    // Defensive: SchedulerRegistry tears down its own jobs, but explicitly
    // stopping protects against double-start in tests / hot reload.
    if (this.schedulerRegistry.doesExist('cron', OrdersScheduler.JOB_NAME)) {
      const job = this.schedulerRegistry.getCronJob(OrdersScheduler.JOB_NAME);
      // cron@4's stop() is sync-by-runtime but its typed return is a Promise.
      // We don't care to await teardown here; just discard it.
      void job.stop();
    }
  }

  /**
   * Public so it can be invoked directly from tests; the cron callback is
   * a thin wrapper that just forwards here.
   */
  async runJob(): Promise<void> {
    try {
      const affected = await this.ordersService.processPendingOrders();
      if (affected === 0) {
        this.logger.debug('No PENDING orders to promote');
      }
    } catch (err) {
      this.logger.error(
        'Failed to promote PENDING orders to PROCESSING',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
