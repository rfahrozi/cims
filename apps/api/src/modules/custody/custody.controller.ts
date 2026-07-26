import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { CustodyService } from './custody.service.js';
import type {
  AcknowledgeTransferNotificationDto,
  RecordCustodyTransferDto,
  SendTransferNotificationDto,
  TransferAccessDto,
  UpdateChecklistStatusDto
} from './dto.js';

@ApiTags('custody')
@Controller('custody-transfers')
export class CustodyController {
  constructor(private readonly service: CustodyService) {}

  /** POST /api/v1/custody-transfers — Catat mutasi tahanan (SOP 10.14 poin 1) */
  @Post()
  record(
    @Body() dto: RecordCustodyTransferDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.record(user, dto, correlationId);
  }

  /** GET /api/v1/custody-transfers/hearings/:hearingId — Riwayat mutasi per perkara */
  @Get('hearings/:hearingId')
  list(@Param('hearingId') hearingId: string, @CurrentUserContext() user: CurrentUser) {
    return this.service.list(hearingId, user);
  }

  /** POST /api/v1/custody-transfers/:id/notify — Kirim notifikasi ke instansi terkait (SOP 10.14 poin 2) */
  @Post(':id/notify')
  sendNotification(
    @Param('id') id: string,
    @Body() dto: SendTransferNotificationDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.sendNotification(user, id, dto, correlationId);
  }

  /** GET /api/v1/custody-transfers/:id/notifications — Daftar notifikasi */
  @Get(':id/notifications')
  listNotifications(@Param('id') id: string, @CurrentUserContext() user: CurrentUser) {
    return this.service.listNotifications(id, user);
  }

  /** POST /api/v1/custody-transfers/notifications/:notifId/acknowledge — ACK notifikasi */
  @Post('notifications/:notifId/acknowledge')
  acknowledgeNotification(
    @Param('notifId') notifId: string,
    @Body() dto: AcknowledgeTransferNotificationDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.acknowledgeNotification(notifId, dto, user, correlationId);
  }

  /** POST /api/v1/custody-transfers/:id/transfer-access — Alihkan akses CIMS (SOP 10.14 poin 3) */
  @Post(':id/transfer-access')
  transferAccess(
    @Param('id') id: string,
    @Body() dto: TransferAccessDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.transferAccess(user, id, dto, correlationId);
  }

  /** POST /api/v1/custody-transfers/:id/checklist — Update status re-checklist lokasi baru (SOP 10.14 poin 4) */
  @Post(':id/checklist')
  updateChecklistStatus(
    @Param('id') id: string,
    @Body() dto: UpdateChecklistStatusDto,
    @CurrentUserContext() user: CurrentUser,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.updateChecklistStatus(user, id, dto, correlationId);
  }
}
