import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { CreateDeterminationDto, CreateRequestDto } from './dto.js';
import { DeterminationsService } from './determinations.service.js';

@ApiTags('determinations')
@Controller()
export class DeterminationsController {
  constructor(private readonly service: DeterminationsService) {}

  @Post('electronic-hearing-requests')
  request(
    @CurrentUserContext() user: CurrentUser,
    @Body() dto: CreateRequestDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.createRequest(user, dto, correlationId);
  }

  @Post('judicial-determinations')
  determine(
    @CurrentUserContext() user: CurrentUser,
    @Body() dto: CreateDeterminationDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.service.createDetermination(user, dto, correlationId);
  }
}
