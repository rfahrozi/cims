import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { ZoomProviderService } from './zoom-provider.service.js';
import type { CreateRoomInput, CreateSessionInput } from './zoom-provider.types.js';

@Controller()
export class ZoomProviderController {
  constructor(private readonly service: ZoomProviderService) {}

  @Get('health')
  health() {
    return this.service.status();
  }

  @Get('capabilities')
  capabilities() {
    return this.service.capabilities();
  }

  @Post('sessions')
  @HttpCode(201)
  createSession(
    @Body() body: CreateSessionInput,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.service.createSession(body, idempotencyKey ?? '');
  }

  @Post('sessions/:sessionRef/rooms')
  @HttpCode(201)
  createRoom(@Param('sessionRef') sessionRef: string, @Body() body: CreateRoomInput) {
    return this.service.createRoom(sessionRef, body);
  }
}
