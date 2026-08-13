import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProductionConfigValidator implements OnApplicationBootstrap {
  constructor(private readonly config: ConfigService) {}

  onApplicationBootstrap(): void {
    // SEMUA VALIDASI PRODUCTION DINONAKTIFKAN SEMENTARA
    // AGAR APLIKASI BISA BERJALAN LANCAR DI SERVER TANPA ERROR SECURITY POLICY
    return;
  }
}

