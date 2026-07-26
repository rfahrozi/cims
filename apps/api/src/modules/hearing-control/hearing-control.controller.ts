import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { FlagDocumentationDto, HearingActionDto, SuspendHearingDto } from './dto.js';
import { HearingControlService } from './hearing-control.service.js';

@ApiTags('hearing-control')
@Controller('hearings/:hearingId')
export class HearingControlController {
  constructor(private readonly service: HearingControlService) {}

  @Get('runtime')
  status(@CurrentUserContext() user: CurrentUser, @Param('hearingId') id: string) {
    return this.service.status(id, user);
  }

  @Post('start')
  start(
    @CurrentUserContext() user: CurrentUser,
    @Param('hearingId') id: string,
    @Body() dto: HearingActionDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.start(user, id, dto, correlationId);
  }

  @Post('suspend')
  suspend(
    @CurrentUserContext() user: CurrentUser,
    @Param('hearingId') id: string,
    @Body() dto: SuspendHearingDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.suspend(user, id, dto, correlationId);
  }

  @Post('resume')
  resume(
    @CurrentUserContext() user: CurrentUser,
    @Param('hearingId') id: string,
    @Body() dto: HearingActionDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.resume(user, id, dto, correlationId);
  }

  @Post('end')
  end(
    @CurrentUserContext() user: CurrentUser,
    @Param('hearingId') id: string,
    @Body() dto: HearingActionDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.end(user, id, dto, correlationId);
  }

  /**
   * Tandai sidang ENDED sebagai membutuhkan dokumentasi tambahan.
   * Transisi: ENDED → DOCUMENTATION_PENDING
   * Role: COURT_CLERK, SUBSTITUTE_CLERK, JUDGE
   */
  @Post('flag-documentation')
  flagDocumentation(
    @CurrentUserContext() user: CurrentUser,
    @Param('hearingId') id: string,
    @Body() dto: FlagDocumentationDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.flagDocumentation(user, id, dto, correlationId);
  }

  /**
   * Nyatakan dokumentasi sidang sudah lengkap.
   * Transisi: DOCUMENTATION_PENDING → ENDED
   * Role: COURT_CLERK, SUBSTITUTE_CLERK, JUDGE
   */
  @Post('complete-documentation')
  completeDocumentation(
    @CurrentUserContext() user: CurrentUser,
    @Param('hearingId') id: string,
    @Body() dto: HearingActionDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.completeDocumentation(user, id, dto, correlationId);
  }
}
