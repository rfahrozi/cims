import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZoomService } from './zoom.service.js';
@ApiTags('zoom')
@Controller('zoom')
export class ZoomController {
  constructor(private readonly service: ZoomService) {}
  @Get('status') status() {
    return this.service.status();
  }
}
