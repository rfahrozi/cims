import { Module } from '@nestjs/common'; import { ZoomController } from './zoom.controller.js'; import { ZoomService } from './zoom.service.js';
@Module({controllers:[ZoomController],providers:[ZoomService]}) export class ZoomModule {}
