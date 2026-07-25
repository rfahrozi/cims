import { Module } from '@nestjs/common'; import { ConfigModule } from '@nestjs/config'; import { ZoomProviderController } from './zoom-provider.controller.js'; import { ZoomProviderService } from './zoom-provider.service.js';
@Module({imports:[ConfigModule.forRoot({isGlobal:true})],controllers:[ZoomProviderController],providers:[ZoomProviderService]}) export class ZoomProviderModule {}
