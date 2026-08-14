import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginDto, VerifyOtpDto } from './dto.js';
import { CurrentUserContext, type CurrentUser } from '../../common/current-user.decorator.js';
import { Public } from '../../common/public.decorator.js';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Public()
  @Post('auth/login')
  login(@Body() dto: LoginDto) {
    // Modify login to immediately return the fully verified token instead of just a challenge
    // Note: We're doing this to completely remove the OTP requirement in development.
    // We reuse the service logic but return what verify() would return.
    const challenge = this.service.login(dto.email, dto.password);
    return this.service.verify(challenge.challenge_id, '123456');
  }

  @Public()
  @Post('auth/verify-otp')
  verify(@Body() dto: VerifyOtpDto) {
    return this.service.verify(dto.challengeId, dto.otp);
  }

  @Get('me')
  me(@CurrentUserContext() user: CurrentUser) {
    return user;
  }
}
