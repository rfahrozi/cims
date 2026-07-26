import { Controller, MessageEvent, Sse, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent, map, filter } from 'rxjs';
import { FastifyRequest } from 'fastify';

/**
 * Controller ini menangani Server-Sent Events (SSE).
 * Frontend meng-subscribe ke endpoint ini untuk mendapatkan update real-time.
 */
@ApiTags('realtime')
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Sse('events')
  streamEvents(@Req() request: FastifyRequest): Observable<MessageEvent> {
    // Event yang dipancarkan secara lokal akan diteruskan ke koneksi SSE yang aktif
    return fromEvent(this.eventEmitter, 'ui.event').pipe(
      map(
        (payload: any) =>
          ({
            data: payload
          }) as MessageEvent
      )
    );
  }
}
