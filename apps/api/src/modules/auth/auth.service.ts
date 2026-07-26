import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
const users = new Map([
  ['clerk@cims.local', { password: 'Clerk123!', name: 'Panitera Demo', role: 'COURT_CLERK' }],
  ['judge@cims.local', { password: 'Judge123!', name: 'Hakim Demo', role: 'JUDGE' }],
  ['admin@cims.local', { password: 'Admin123!', name: 'Admin Demo', role: 'SYSTEM_ADMIN' }]
]);
@Injectable()
export class AuthService {
  private challenges = new Map<string, string>();
  login(email: string, password: string) {
    const user = users.get(email);
    if (!user || user.password !== password) throw new UnauthorizedException('Invalid credentials');
    const id = randomUUID();
    this.challenges.set(id, email);
    return { challenge_id: id, expires_in_seconds: 300, development_otp: '123456' };
  }
  verify(challengeId: string, otp: string) {
    const email = this.challenges.get(challengeId);
    if (!email || otp !== '123456') throw new UnauthorizedException('Invalid OTP');
    const user = users.get(email)!;
    return {
      access_token: Buffer.from(JSON.stringify({ email, role: user.role })).toString('base64url'),
      token_type: 'Bearer',
      user: { id: email, name: user.name, role: user.role, organization_id: 'court-demo' }
    };
  }
}
