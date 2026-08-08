import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

const users = new Map([
  ['clerk@cims.local', { 
    passwordHash: '$2b$10$HmHSTMPJe02GYHO7sJhVauuOVoFPZs/ugEeR7paU7cRKal9kcri9G', // Clerk123!
    name: 'Panitera Demo', 
    role: 'COURT_CLERK' 
  }],
  ['judge@cims.local', { 
    passwordHash: '$2b$10$5fpTxSGx30Q70cLl951oOO4ju7xBUR4N6D1CqBK5da0ezwubrw4tO', // Judge123!
    name: 'Hakim Demo', 
    role: 'JUDGE' 
  }],
  ['admin@cims.local', { 
    passwordHash: '$2b$10$VXjzC6ZmhyocTs2s4tiTi.BlxIzv5xV8GbBCghx8yBApz.yLZEzKO', // Admin123!
    name: 'Admin Demo', 
    role: 'SYSTEM_ADMIN' 
  }]
]);

@Injectable()
export class AuthService {
  private challenges = new Map<string, string>();

  constructor(private readonly jwtService: JwtService) {}

  async login(email: string, password: string) {
    const user = users.get(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');
    
    const id = randomUUID();
    this.challenges.set(id, email);
    return { challenge_id: id, expires_in_seconds: 300, development_otp: '123456' };
  }

  async verify(challengeId: string, otp: string) {
    const email = this.challenges.get(challengeId);
    if (!email || otp !== '123456') throw new UnauthorizedException('Invalid OTP');
    
    const user = users.get(email)!;
    this.challenges.delete(challengeId);
    
    const payload = { 
      sub: email, 
      email,
      name: user.name,
      role: user.role,
      roles: [user.role],
      organization_ids: ['court-demo'],
      permissions: ['*'], // Simplified for dev
      hearing_assignments: [] 
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      token_type: 'Bearer',
      user: { id: email, name: user.name, role: user.role, organization_id: 'court-demo' }
    };
  }
}
