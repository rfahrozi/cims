import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

const users = new Map([
  ['panitera', { 
    id: '196809011996031001',
    passwordHash: '$2b$10$P47GSldnj3qAWAW.EFLa1O5OSOxmix8pfUUhIPioX3FvFfXPNPXtG', // password123
    name: 'SAPTA PUTRA, S.H.', 
    role: 'COURT_CLERK',
    orgId: 'pn-tanjungpinang'
  }],
  ['hakim', { 
    id: '196506301992121001',
    passwordHash: '$2b$10$P47GSldnj3qAWAW.EFLa1O5OSOxmix8pfUUhIPioX3FvFfXPNPXtG', // password123
    name: 'WENDRA RAIS, S.H., M.H.', 
    role: 'JUDGE',
    orgId: 'pn-tanjungpinang'
  }],
  ['jaksa', {
    id: '198001012005011001',
    passwordHash: '$2b$10$P47GSldnj3qAWAW.EFLa1O5OSOxmix8pfUUhIPioX3FvFfXPNPXtG', // password123
    name: 'Penuntut Umum Demo',
    role: 'PROSECUTOR',
    orgId: 'kejari-tanjungpinang'
  }],
  ['rutan', {
    id: '198501012010011002',
    passwordHash: '$2b$10$P47GSldnj3qAWAW.EFLa1O5OSOxmix8pfUUhIPioX3FvFfXPNPXtG', // password123
    name: 'Petugas Rutan Demo',
    role: 'CORRECTIONS',
    orgId: 'rutan-tanjungpinang'
  }],
  ['admin', { 
    id: 'admin-demo',
    passwordHash: '$2b$10$P47GSldnj3qAWAW.EFLa1O5OSOxmix8pfUUhIPioX3FvFfXPNPXtG', // password123
    name: 'Administrator', 
    role: 'SYSTEM_ADMIN',
    orgId: 'pn-tanjungpinang'
  }]
]);

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(username: string, password: string) {
    const user = users.get(username);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    
    // Simulate bcrypt check for 'password123'
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');
    
    // The payload needs to exactly match the CurrentUser interface
    const payload = { 
      id: user.id,
      sub: username, 
      name: user.name,
      role: user.role,
      roles: [user.role],
      organizationId: user.orgId,
      organizationIds: [user.orgId, 'pn-batam', 'pn-karimun'],
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
