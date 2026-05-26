import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Protects fulfillment endpoints with a shared secret passed via the
 * `X-Admin-Key` header. Deliberately separate from JWT — warehouse /
 * internal services don't log in as customers.
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header('x-admin-key');
    const expected = this.configService.getOrThrow<string>('app.adminApiKey');

    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid or missing admin API key');
    }

    return true;
  }
}
