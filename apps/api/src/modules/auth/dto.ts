import { IsString, Length, MinLength } from 'class-validator';

export class LoginDto {
  @IsString() username!: string;
  @IsString() @MinLength(8) password!: string;
}

export class VerifyOtpDto {
  @IsString() challengeId!: string;
  @IsString() @Length(6, 6) otp!: string;
}
