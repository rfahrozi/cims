import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto.js';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { Public } from '../../common/public.decorator.js';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Public() 
  @Post('auth/login') 
  login(@Body() dto: LoginDto) {
    return this.service.login(dto.username, dto.password);
  }

  @Get('me') 
  me(@CurrentUserContext() user: CurrentUser) {
    return user;
  }
}
