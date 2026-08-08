import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

const users = new Map([
  ['panitera', { 
    passwordHash: '$2b$10$P47GSldnj3qAWAW.EFLa1O5OSOxmix8pfUUhIPioX3FvFfXPNPXtG', // password123
    name: 'Panitera Demo', 
    role: 'COURT_CLERK' 
  }],
  ['hakim', { 
    passwordHash: '$2b$10$P47GSldnj3qAWAW.EFLa1O5OSOxmix8pfUUhIPioX3FvFfXPNPXtG', // password123
    name: 'Hakim Demo', 
    role: 'JUDGE' 
  }],
  ['admin', { 
    passwordHash: '$2b$10$P47GSldnj3qAWAW.EFLa1O5OSOxmix8pfUUhIPioX3FvFfXPNPXtG', // password123
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
    
    // The payload needs to exactly match the CurrentUser interface
    const payload = { 
      id: username,
      sub: username, 
      name: user.name,
      role: user.role,
      roles: [user.role],
      organizationId: 'court-demo',
      organizationIds: ['court-demo'],
      permissions: ['*'], // Simplified for dev
      hearingAssignments: ['hearing-demo-001', 'hearing-demo-002', 'hearing-demo-003'],
      authSource: 'DEV_LOCAL'
    };

    return {
      token: await this.jwtService.signAsync(payload),
      user: payload
    };
  }
}
