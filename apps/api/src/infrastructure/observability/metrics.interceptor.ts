import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  HttpException
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service.js';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Gunakan rute/pattern dari NestJS (e.g. /api/v1/hearings/:id) jika tersedia,
    // jika tidak fallback ke path aktual
    const route = request.route?.path ?? request.routerPath ?? request.url;
    const method = request.method;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const status = response.statusCode ?? 200;
          this.recordMetrics(method, route, status, duration);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const status = error instanceof HttpException ? error.getStatus() : 500;
          this.recordMetrics(method, route, status, duration);
        }
      })
    );
  }

  private recordMetrics(method: string, route: string, status: number, duration: number) {
    const labels = {
      method,
      route,
      status: String(status)
    };

    this.metrics.increment('http_requests_total', labels);
    this.metrics.observe('http_request_duration_ms', duration, labels);
  }
}
