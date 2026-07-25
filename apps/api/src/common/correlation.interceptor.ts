import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Observable } from 'rxjs';

@Injectable()
export class CorrelationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<{ headers: Record<string, string | undefined>; correlationId?: string }>();
    const response = http.getResponse<{ header(name: string, value: string): void }>();
    const id = request.headers['x-correlation-id'] ?? randomUUID();
    request.correlationId = id;
    response.header('x-correlation-id', id);
    return next.handle();
  }
}
