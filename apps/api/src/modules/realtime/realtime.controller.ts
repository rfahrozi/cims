import { Controller, MessageEvent, Sse, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent, map, filter } from 'rxjs';
import {
  CurrentUserContext as User,
  type CurrentUser
} from '../../common/current-user.decorator.js';

/**
 * Controller ini menangani Server-Sent Events (SSE).
 * Frontend meng-subscribe ke endpoint ini untuk mendapatkan update real-time.
 */
@ApiTags('realtime')
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Sse('events')
  streamEvents(@User() user: CurrentUser): Observable<MessageEvent> {
    // Event yang dipancarkan secara lokal akan diteruskan ke koneksi SSE yang aktif,
    // asalkan user memiliki kewenangan pada hearing tersebut.
    return fromEvent(this.eventEmitter, 'ui.event').pipe(
      filter((payload: any) => {
        if (!payload || !payload.hearingId) return false;
        if (user.roles?.includes('SYSTEM_ADMIN') || user.permissions?.includes('*')) return true;
        return user.hearingAssignments?.includes(payload.hearingId) ?? false;
      }),
      map(
        (payload: any) =>
          ({
            data: payload
          }) as MessageEvent
      )
    );
  }
}
