import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

const users = new Map([
  ['panitera', { 
    passwordHash: '$2b$10$HmHSTMPJe02GYHO7sJhVauuOVoFPZs/ugEeR7paU7cRKal9kcri9G', // password123
    name: 'Panitera Demo', 
    role: 'COURT_CLERK' 
  }],
  ['hakim', { 
    passwordHash: '$2b$10$HmHSTMPJe02GYHO7sJhVauuOVoFPZs/ugEeR7paU7cRKal9kcri9G', // password123
    name: 'Hakim Demo', 
    role: 'JUDGE' 
  }],
  ['admin', { 
    passwordHash: '$2b$10$HmHSTMPJe02GYHO7sJhVauuOVoFPZs/ugEeR7paU7cRKal9kcri9G', // password123
    name: 'Admin Demo', 
    role: 'SYSTEM_ADMIN' 
  }]
]);

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(username: string, password: string) {
    const user = users.get(username);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    
    // Simulate bcrypt check for 'password123'
    // Note: since all users use 'password123', the hash provided above is matched for all
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');
    
    const payload = { 
      sub: username, 
      name: user.name,
      role: user.role,
      roles: [user.role],
      organization_ids: ['court-demo'],
      permissions: ['*'], // Simplified for dev
      hearing_assignments: [],
      authSource: 'DEV_LOCAL'
    };

    return {
      token: await this.jwtService.signAsync(payload),
      user: { id: username, name: user.name, role: user.role, roles: [user.role], organization_id: 'court-demo' }
    };
  }
}
