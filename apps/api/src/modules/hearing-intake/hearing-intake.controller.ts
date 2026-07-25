import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { RequirePermissions } from '../../common/permissions.decorator.js';
import { HearingIntakeService } from './hearing-intake.service.js';
import { ImportJobRequestDto, ManualHearingDto, ReturnManualHearingDto, UpdateManualHearingDto } from './dto.js';

@ApiTags('hearing-intake')
@Controller()
export class HearingIntakeController {
  constructor(private readonly service: HearingIntakeService) {}

  @Get('hearing-intake/reference-data')
  @RequirePermissions('hearing.intake.read')
  referenceData(@CurrentUserContext() user: CurrentUser) { return this.service.referenceData(user); }

  @Get('hearing-intake/manual')
  @RequirePermissions('hearing.intake.read')
  async list(@CurrentUserContext() user: CurrentUser, @Query('status') status?: string, @Query('q') query?: string) { return { items: await this.service.list(user, status, query) }; }

  @Post('hearing-intake/manual')
  @RequirePermissions('hearing.intake.create')
  create(@CurrentUserContext() user: CurrentUser, @Body() dto: ManualHearingDto, @Headers('x-correlation-id') correlationId?: string) { return this.service.create(user, dto, correlationId); }

  @Get('hearing-intake/manual/:hearingId')
  @RequirePermissions('hearing.intake.read')
  get(@CurrentUserContext() user: CurrentUser, @Param('hearingId') hearingId: string) { return this.service.get(user, hearingId); }

  @Patch('hearing-intake/manual/:hearingId')
  @RequirePermissions('hearing.intake.write')
  update(@CurrentUserContext() user: CurrentUser, @Param('hearingId') hearingId: string, @Body() dto: UpdateManualHearingDto, @Headers('x-correlation-id') correlationId?: string) { return this.service.update(user, hearingId, dto, correlationId); }

  @Post('hearing-intake/manual/:hearingId/submit')
  @RequirePermissions('hearing.intake.submit')
  submit(@CurrentUserContext() user: CurrentUser, @Param('hearingId') hearingId: string, @Headers('x-correlation-id') correlationId?: string) { return this.service.submit(user, hearingId, correlationId); }

  @Post('hearing-intake/manual/:hearingId/activate')
  @RequirePermissions('hearing.intake.review')
  activate(@CurrentUserContext() user: CurrentUser, @Param('hearingId') hearingId: string, @Headers('x-correlation-id') correlationId?: string) { return this.service.activate(user, hearingId, correlationId); }

  @Post('hearing-intake/manual/:hearingId/return')
  @RequirePermissions('hearing.intake.review')
  returnForCorrection(@CurrentUserContext() user: CurrentUser, @Param('hearingId') hearingId: string, @Body() dto: ReturnManualHearingDto, @Headers('x-correlation-id') correlationId?: string) { return this.service.returnForCorrection(user, hearingId, dto, correlationId); }

  @Post('hearing-intake/manual/:hearingId/reopen')
  @RequirePermissions('hearing.intake.write')
  reopen(@CurrentUserContext() user: CurrentUser, @Param('hearingId') hearingId: string, @Headers('x-correlation-id') correlationId?: string) { return this.service.reopen(user, hearingId, correlationId); }

  @Get('hearing-import/sources')
  @RequirePermissions('hearing.import.read')
  sources(@CurrentUserContext() user: CurrentUser) { return this.service.importSources(user); }

  @Post('hearing-import/jobs')
  @RequirePermissions('hearing.import.execute')
  requestImport(@CurrentUserContext() user: CurrentUser, @Body() dto: ImportJobRequestDto) { return this.service.requestImport(user, dto); }
}
