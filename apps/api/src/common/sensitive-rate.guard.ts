import { CanActivate, ExecutionContext, Injectable, Logger, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';

/**
 * M-10 DLP — Guard rate limit ketat untuk endpoint sensitif.
 *
 * Penggunaan di controller:
 *   @UseGuards(SensitiveRateGuard)
 *   @SensitiveEndpoint({ maxPerMinute: 10, maxRecords: 500 })
 *   @Get('export')
 *   async export() { ... }
 *
 * Guard ini:
 * 1. Membatasi jumlah request per IP per menit (lebih ketat dari rate limit global)
 * 2. Mencatat setiap akses ke endpoint sensitif di log terstruktur
 * 3. Menolak request jika melebihi batas
 */

export const SENSITIVE_ENDPOINT_KEY = 'cims:sensitive-endpoint';

export interface SensitiveEndpointOptions {
  /** Maksimum request per menit per IP (default: 10) */
  maxPerMinute?: number;
  /** Label untuk log — default nama method+path */
  label?: string;
}

export const SensitiveEndpoint =
  (opts?: SensitiveEndpointOptions) =>
  (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(SENSITIVE_ENDPOINT_KEY, opts ?? {}, descriptor.value as object);
    return descriptor;
  };

interface RateBucket {
  count: number;
  windowStart: number;
}

@Injectable()
export class SensitiveRateGuard implements CanActivate {
  private readonly logger = new Logger('SensitiveRateGuard');
  private readonly buckets = new Map<string, RateBucket>();
  private readonly WINDOW_MS = 60_000; // 1 menit
  private readonly DEFAULT_MAX = 10; // 10 request/menit per IP untuk endpoint sensitif

  constructor(private readonly reflector: Reflector) {
    // Bersihkan bucket yang kadaluarsa setiap 5 menit agar tidak memory leak
    setInterval(() => this.cleanup(), 5 * 60_000).unref();
  }

  canActivate(context: ExecutionContext): boolean {
    const opts = this.reflector.get<SensitiveEndpointOptions>(
      SENSITIVE_ENDPOINT_KEY,
      context.getHandler()
    );

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const ip = this.getIp(request);
    const path = request.url ?? 'unknown';
    const label = opts?.label ?? path;
    const maxPerMinute = opts?.maxPerMinute ?? this.DEFAULT_MAX;

    const key = `${ip}:${label}`;
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (bucket && now - bucket.windowStart < this.WINDOW_MS) {
      bucket.count++;
      if (bucket.count > maxPerMinute) {
        this.logger.warn({
          event: 'SENSITIVE_RATE_LIMIT_EXCEEDED',
          ip,
          label,
          count: bucket.count,
          maxPerMinute,
          path
        });
        throw new HttpException(
          `Terlalu banyak akses ke endpoint sensitif. Batas: ${maxPerMinute} request/menit.`,
          429
        );
      }
    } else {
      this.buckets.set(key, { count: 1, windowStart: now });
    }

    // Catat setiap akses ke endpoint sensitif (DLP audit log)
    this.logger.log({
      event: 'SENSITIVE_ENDPOINT_ACCESSED',
      ip,
      label,
      path,
      userId:
        (request as FastifyRequest & { user?: { id?: string } }).user?.id ?? 'unauthenticated',
      timestamp: new Date().toISOString()
    });

    return true;
  }

  private getIp(request: FastifyRequest): string {
    // Ambil IP dari X-Forwarded-For jika di belakang proxy, fallback ke koneksi langsung
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    if (Array.isArray(forwarded)) return forwarded[0];
    return request.ip ?? 'unknown';
  }

  private cleanup(): void {
    const threshold = Date.now() - this.WINDOW_MS;
    for (const [key, bucket] of this.buckets) {
      if (bucket.windowStart < threshold) this.buckets.delete(key);
    }
  }
}
